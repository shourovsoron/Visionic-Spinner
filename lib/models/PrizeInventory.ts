import mongoose, { Schema, type Document, type Model } from "mongoose";
import { PRIZE_TYPES, type PrizeType } from "../prizeTypes";

export interface PrizeInventoryDocument extends Document {
  prizeType: PrizeType;
  totalQuantity: number;
  remainingQuantity: number;
}

const PrizeInventorySchema = new Schema<PrizeInventoryDocument>({
  prizeType: { type: String, required: true, enum: PRIZE_TYPES, unique: true },
  totalQuantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 },
});

export const PrizeInventory: Model<PrizeInventoryDocument> =
  mongoose.models.PrizeInventory ||
  mongoose.model<PrizeInventoryDocument>("PrizeInventory", PrizeInventorySchema);
