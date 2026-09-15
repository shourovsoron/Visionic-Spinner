import { randomBytes } from "crypto";
import type { PrizeType } from "./prizeTypes";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity
const CODE_LENGTH = 6;

const PREFIX_BY_PRIZE: Partial<Record<PrizeType, string>> = {
  coupon_20: "SPIN20",
  coupon_15: "SPIN15",
};

function randomSegment(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function generateCouponCode(prizeType: PrizeType): string {
  const prefix = PREFIX_BY_PRIZE[prizeType];
  if (!prefix) {
    throw new Error(`Prize type ${prizeType} does not use coupon codes.`);
  }
  return `${prefix}-${randomSegment()}`;
}

export function prizeUsesCoupon(prizeType: PrizeType): boolean {
  return prizeType in PREFIX_BY_PRIZE;
}
