import { connectToDatabase } from "./mongodb";
import { PrizeInventory } from "./models/PrizeInventory";
import { PRIZE_TYPES, PRIZE_LABELS as DEFAULT_PRIZE_LABELS, type PrizeType } from "./prizeTypes";

/**
 * Prize display names are editable from the admin dashboard and stored on the
 * PrizeInventory documents. PRIZE_LABELS in prizeTypes.ts is only the seed default
 * for prize types that don't have a custom label saved yet.
 */
export async function getPrizeLabels(): Promise<Record<PrizeType, string>> {
  await connectToDatabase();
  const docs = await PrizeInventory.find({}).select("prizeType label").lean();
  const byType = new Map(docs.map((d) => [d.prizeType, d.label]));

  return Object.fromEntries(
    PRIZE_TYPES.map((type) => [type, byType.get(type) || DEFAULT_PRIZE_LABELS[type]])
  ) as Record<PrizeType, string>;
}
