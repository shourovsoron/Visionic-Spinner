// One-time inventory seed. Run with: npm run seed
// Refuses to run if prizeInventory already has documents, so it never silently
// resets a live campaign.
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local.");
  process.exit(1);
}

const TOTAL_CAMPAIGN_SPINS = 800;

const quantities = {
  flight_ticket: Number(process.env.FLIGHT_TICKET_QTY ?? 3),
  tshirt: Number(process.env.TSHIRT_QTY ?? 10),
  coupon_20: Number(process.env.COUPON_20_QTY ?? 400),
  coupon_15: Number(process.env.COUPON_15_QTY ?? 387),
};

const total = Object.values(quantities).reduce((sum, n) => sum + n, 0);
if (total !== TOTAL_CAMPAIGN_SPINS) {
  console.error(
    `Inventory quantities sum to ${total}, but must equal exactly ${TOTAL_CAMPAIGN_SPINS}.\n` +
      `Got: ${JSON.stringify(quantities)}\n` +
      `Adjust FLIGHT_TICKET_QTY / TSHIRT_QTY / COUPON_20_QTY / COUPON_15_QTY in .env.local.`
  );
  process.exit(1);
}

const PrizeInventorySchema = new mongoose.Schema({
  prizeType: { type: String, required: true, unique: true },
  totalQuantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
});
const PrizeInventory = mongoose.model("PrizeInventory", PrizeInventorySchema);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const existingCount = await PrizeInventory.countDocuments();
  if (existingCount > 0) {
    console.log(
      `prizeInventory already has ${existingCount} document(s) — refusing to overwrite an existing campaign. ` +
        `Manage quantities from /dashboard instead.`
    );
    await mongoose.disconnect();
    return;
  }

  const docs = Object.entries(quantities).map(([prizeType, qty]) => ({
    prizeType,
    totalQuantity: qty,
    remainingQuantity: qty,
  }));

  await PrizeInventory.insertMany(docs);
  console.log(`Seeded prizeInventory (total = ${total}):`);
  console.table(docs);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
