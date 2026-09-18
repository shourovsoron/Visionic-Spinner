import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { PrizeInventory } from "@/lib/models/PrizeInventory";
import { isAuthenticatedRequest } from "@/lib/adminAuth";
import {
  PRIZE_TYPES,
  PRIZE_LABELS as DEFAULT_PRIZE_LABELS,
  TOTAL_CAMPAIGN_SPINS,
  isPrizeType,
  type PrizeType,
} from "@/lib/prizeTypes";

const MAX_LABEL_LENGTH = 60;

export async function GET(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const docs = await PrizeInventory.find({}).lean();
    const byType = new Map(docs.map((d) => [d.prizeType, d]));
    const inventory = PRIZE_TYPES.map((prizeType) => ({
      prizeType,
      totalQuantity: byType.get(prizeType)?.totalQuantity ?? 0,
      remainingQuantity: byType.get(prizeType)?.remainingQuantity ?? 0,
      label: byType.get(prizeType)?.label || DEFAULT_PRIZE_LABELS[prizeType],
    }));
    return NextResponse.json({ inventory, totalCampaignSpins: TOTAL_CAMPAIGN_SPINS });
  } catch (err) {
    console.error("GET /api/admin/inventory failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

interface InventoryUpdate {
  prizeType: PrizeType;
  totalQuantity: number;
  label: string;
}

export async function POST(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const updates = (body as { updates?: unknown })?.updates;
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ message: "No updates provided." }, { status: 422 });
  }

  const parsedUpdates: InventoryUpdate[] = [];
  for (const raw of updates) {
    const u = raw as { prizeType?: unknown; totalQuantity?: unknown; label?: unknown };
    if (!isPrizeType(u.prizeType)) {
      return NextResponse.json({ message: "Invalid prize type in update." }, { status: 422 });
    }
    const qty = Number(u.totalQuantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return NextResponse.json(
        { message: "Total quantity must be a non-negative whole number." },
        { status: 422 }
      );
    }

    const label = typeof u.label === "string" ? u.label.trim() : "";
    if (!label) {
      return NextResponse.json({ message: "Prize name cannot be empty." }, { status: 422 });
    }
    if (label.length > MAX_LABEL_LENGTH) {
      return NextResponse.json(
        { message: `Prize name must be ${MAX_LABEL_LENGTH} characters or fewer.` },
        { status: 422 }
      );
    }

    parsedUpdates.push({ prizeType: u.prizeType, totalQuantity: qty, label });
  }

  const session = await mongoose.startSession();
  try {
    await connectToDatabase();
    const outcome: { result: { inventory: unknown } | { error: string } | null } = { result: null };

    await session.withTransaction(async () => {
      const docs = await PrizeInventory.find({}).session(session);
      const byType = new Map(docs.map((d) => [d.prizeType, d]));

      const updateMap = new Map(parsedUpdates.map((u) => [u.prizeType, u.totalQuantity]));
      const labelMap = new Map(parsedUpdates.map((u) => [u.prizeType, u.label]));

      const nextTotals = PRIZE_TYPES.map((prizeType) => {
        const doc = byType.get(prizeType);
        const currentTotal = doc?.totalQuantity ?? 0;
        const currentRemaining = doc?.remainingQuantity ?? 0;
        const consumed = currentTotal - currentRemaining;
        const nextTotal = updateMap.has(prizeType) ? (updateMap.get(prizeType) as number) : currentTotal;
        const nextLabel = labelMap.has(prizeType) ? (labelMap.get(prizeType) as string) : doc?.label;
        return { prizeType, nextTotal, consumed, nextLabel };
      });

      const grandTotal = nextTotals.reduce((sum, t) => sum + t.nextTotal, 0);
      if (grandTotal !== TOTAL_CAMPAIGN_SPINS) {
        outcome.result = {
          error: `Total inventory must equal exactly ${TOTAL_CAMPAIGN_SPINS}. Your changes sum to ${grandTotal}.`,
        };
        return;
      }

      for (const t of nextTotals) {
        if (t.nextTotal < t.consumed) {
          outcome.result = {
            error: `Cannot set ${t.prizeType} total below ${t.consumed}, since that many have already been awarded.`,
          };
          return;
        }
      }

      for (const t of nextTotals) {
        await PrizeInventory.findOneAndUpdate(
          { prizeType: t.prizeType },
          {
            $set: {
              totalQuantity: t.nextTotal,
              remainingQuantity: t.nextTotal - t.consumed,
              ...(t.nextLabel ? { label: t.nextLabel } : {}),
            },
          },
          { session, upsert: true }
        );
      }

      const updatedDocs = await PrizeInventory.find({}).session(session).lean();
      outcome.result = { inventory: updatedDocs };
    });

    await session.endSession();

    const { result } = outcome;
    if (result && "error" in result) {
      return NextResponse.json({ message: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true, ...(result ?? {}) });
  } catch (err) {
    await session.endSession();
    console.error("POST /api/admin/inventory failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
