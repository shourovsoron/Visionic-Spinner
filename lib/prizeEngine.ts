import mongoose from "mongoose";
import { connectToDatabase } from "./mongodb";
import { Participant } from "./models/Participant";
import { PrizeInventory } from "./models/PrizeInventory";
import { generateCouponCode, prizeUsesCoupon } from "./coupon";
import type { PrizeType } from "./prizeTypes";
import type { ValidatedSpinInput } from "./validation";

export type SpinOutcome =
  | { status: "won"; prize: PrizeType; couponCode?: string }
  | { status: "already_participated" }
  | { status: "exhausted" };

const MAX_TRANSACTION_ATTEMPTS = 8;
const MAX_COUPON_ATTEMPTS = 5;

function isTransientTransactionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const labels = (err as { errorLabels?: string[] }).errorLabels;
  return Array.isArray(labels) && labels.includes("TransientTransactionError");
}

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: number }).code === 11000);
}

function pickWeightedPrize(
  available: { prizeType: PrizeType; remainingQuantity: number }[]
): PrizeType {
  const total = available.reduce((sum, doc) => sum + doc.remainingQuantity, 0);
  let roll = Math.random() * total;
  for (const doc of available) {
    if (roll < doc.remainingQuantity) return doc.prizeType;
    roll -= doc.remainingQuantity;
  }
  // Floating point edge case: fall back to the last item.
  return available[available.length - 1].prizeType;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validates eligibility, atomically reserves a prize from inventory, and creates
 * the participant record — all inside a single MongoDB transaction that is retried
 * on write conflicts. This is the only place prize selection happens.
 */
export async function reserveSpin(input: ValidatedSpinInput): Promise<SpinOutcome> {
  await connectToDatabase();

  const existingFastPath = await Participant.findOne({
    $or: [{ email: input.email }, { phone: input.phone }],
  })
    .select("_id")
    .lean();
  if (existingFastPath) {
    return { status: "already_participated" };
  }

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      let outcome: SpinOutcome | null = null;

      await session.withTransaction(async () => {
        const existing = await Participant.findOne({
          $or: [{ email: input.email }, { phone: input.phone }],
        })
          .session(session)
          .select("_id");

        if (existing) {
          outcome = { status: "already_participated" };
          return;
        }

        const inventoryDocs = await PrizeInventory.find({}).session(session);
        const available = inventoryDocs
          .filter((doc) => doc.remainingQuantity > 0)
          .map((doc) => ({ prizeType: doc.prizeType, remainingQuantity: doc.remainingQuantity }));

        if (available.length === 0) {
          outcome = { status: "exhausted" };
          return;
        }

        const prize = pickWeightedPrize(available);

        const reserved = await PrizeInventory.findOneAndUpdate(
          { prizeType: prize, remainingQuantity: { $gt: 0 } },
          { $inc: { remainingQuantity: -1 } },
          { session, new: true }
        );

        if (!reserved) {
          // Snapshot said available, but the decrement failed — force a transaction retry.
          throw Object.assign(new Error("Prize reservation race, retrying transaction"), {
            errorLabels: ["TransientTransactionError"],
          });
        }

        let couponCode: string | undefined;
        if (prizeUsesCoupon(prize)) {
          for (let couponAttempt = 0; couponAttempt < MAX_COUPON_ATTEMPTS; couponAttempt++) {
            const candidate = generateCouponCode(prize);
            const collision = await Participant.findOne({ couponCode: candidate })
              .session(session)
              .select("_id");
            if (!collision) {
              couponCode = candidate;
              break;
            }
          }
          if (!couponCode) {
            throw new Error("Failed to generate a unique coupon code.");
          }
        }

        await Participant.create(
          [
            {
              phone: input.phone,
              email: input.email,
              customerType: input.customerType,
              website: input.website,
              lookingForDesign: input.lookingForDesign,
              prize,
              couponCode,
            },
          ],
          { session }
        );

        outcome = { status: "won", prize, couponCode };
      });

      await session.endSession();

      if (outcome) return outcome;
      // Should not happen, but guard against an empty transaction result.
      throw new Error("Transaction completed without an outcome.");
    } catch (err) {
      await session.endSession();

      if (isDuplicateKeyError(err)) {
        return { status: "already_participated" };
      }

      if (isTransientTransactionError(err) && attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
        await delay(25 * (attempt + 1));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Unable to complete spin after multiple attempts. Please try again.");
}

export interface DeleteParticipantsResult {
  deletedCount: number;
  restoredByPrize: Partial<Record<PrizeType, number>>;
  notFoundIds: string[];
}

/**
 * Every participant holds exactly one prize, so deleting them must return that unit to
 * inventory. Uses the same retry-on-conflict transaction pattern as reserveSpin: the
 * participant set is re-read inside the transaction (so a concurrent duplicate delete of
 * the same id finds nothing left to restore on retry, never double-restoring), the
 * restore is guarded so remainingQuantity can never exceed totalQuantity, and the whole
 * thing is all-or-nothing — delete only commits once every restore has succeeded.
 */
export async function deleteParticipantsAndRestorePrizes(
  participantIds: string[]
): Promise<DeleteParticipantsResult> {
  await connectToDatabase();

  const objectIds = participantIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) {
    return { deletedCount: 0, restoredByPrize: {}, notFoundIds: participantIds };
  }

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      let result: DeleteParticipantsResult | null = null;

      await session.withTransaction(async () => {
        const participants = await Participant.find({ _id: { $in: objectIds } })
          .session(session)
          .select("_id prize");

        if (participants.length === 0) {
          result = { deletedCount: 0, restoredByPrize: {}, notFoundIds: participantIds };
          return;
        }

        const counts = new Map<PrizeType, number>();
        for (const p of participants) {
          counts.set(p.prize, (counts.get(p.prize) ?? 0) + 1);
        }

        for (const [prizeType, count] of counts) {
          const restored = await PrizeInventory.findOneAndUpdate(
            {
              prizeType,
              // Belt-and-braces: never let a restore push remainingQuantity past totalQuantity.
              $expr: { $lte: [{ $add: ["$remainingQuantity", count] }, "$totalQuantity"] },
            },
            { $inc: { remainingQuantity: count } },
            { session, new: true }
          );

          if (!restored) {
            throw new Error(
              `Restoring ${count} unit(s) of ${prizeType} would exceed its totalQuantity — aborting delete.`
            );
          }
        }

        const foundIds = participants.map((p) => String(p._id));
        await Participant.deleteMany({ _id: { $in: foundIds } }, { session });

        result = {
          deletedCount: foundIds.length,
          restoredByPrize: Object.fromEntries(counts) as Partial<Record<PrizeType, number>>,
          notFoundIds: participantIds.filter((id) => !foundIds.includes(id)),
        };
      });

      await session.endSession();

      if (result) return result;
      throw new Error("Transaction completed without a result.");
    } catch (err) {
      await session.endSession();

      if (isTransientTransactionError(err) && attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
        await delay(25 * (attempt + 1));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Unable to complete deletion after multiple attempts. Please try again.");
}
