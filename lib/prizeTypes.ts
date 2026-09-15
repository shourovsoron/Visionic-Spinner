export const PRIZE_TYPES = ["flight_ticket", "tshirt", "coupon_20", "coupon_15"] as const;
export type PrizeType = (typeof PRIZE_TYPES)[number];

export const PRIZE_LABELS: Record<PrizeType, string> = {
  flight_ticket: "Flight Ticket",
  tshirt: "T-Shirt",
  coupon_20: "20% Discount Coupon",
  coupon_15: "15% Discount Coupon",
};

export const TOTAL_CAMPAIGN_SPINS = 800;

export function isPrizeType(value: unknown): value is PrizeType {
  return typeof value === "string" && (PRIZE_TYPES as readonly string[]).includes(value);
}
