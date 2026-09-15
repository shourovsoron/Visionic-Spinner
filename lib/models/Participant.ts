import mongoose, { Schema, type Document, type Model } from "mongoose";
import { PRIZE_TYPES, type PrizeType } from "../prizeTypes";

export interface ParticipantDocument extends Document {
  fullName: string;
  phone: string;
  email: string;
  customerType: "individual" | "business";
  website?: string;
  lookingForDesign: "yes" | "no";
  prize: PrizeType;
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<ParticipantDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    customerType: { type: String, required: true, enum: ["individual", "business"] },
    website: { type: String, trim: true },
    lookingForDesign: { type: String, required: true, enum: ["yes", "no"] },
    prize: { type: String, required: true, enum: PRIZE_TYPES },
    couponCode: { type: String, trim: true },
  },
  { timestamps: true }
);

ParticipantSchema.index({ email: 1 }, { unique: true });
ParticipantSchema.index({ phone: 1 }, { unique: true });
ParticipantSchema.index({ couponCode: 1 }, { unique: true, sparse: true });
ParticipantSchema.index({ createdAt: -1 });
ParticipantSchema.index({ prize: 1 });
ParticipantSchema.index({ customerType: 1 });

export const Participant: Model<ParticipantDocument> =
  mongoose.models.Participant || mongoose.model<ParticipantDocument>("Participant", ParticipantSchema);
