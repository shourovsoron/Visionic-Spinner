import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/lib/models/Participant";
import { PrizeInventory } from "@/lib/models/PrizeInventory";
import { isAuthenticatedRequest } from "@/lib/adminAuth";
import { PRIZE_TYPES, PRIZE_LABELS as DEFAULT_PRIZE_LABELS, TOTAL_CAMPAIGN_SPINS } from "@/lib/prizeTypes";

export async function GET(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const [totalSpins, inventoryDocs] = await Promise.all([
      Participant.countDocuments(),
      PrizeInventory.find({}).lean(),
    ]);

    const inventoryByType = new Map(inventoryDocs.map((doc) => [doc.prizeType, doc]));
    const inventory = PRIZE_TYPES.map((prizeType) => {
      const doc = inventoryByType.get(prizeType);
      return {
        prizeType,
        totalQuantity: doc?.totalQuantity ?? 0,
        remainingQuantity: doc?.remainingQuantity ?? 0,
        label: doc?.label || DEFAULT_PRIZE_LABELS[prizeType],
      };
    });

    return NextResponse.json({
      totalSpins,
      totalCampaignSpins: TOTAL_CAMPAIGN_SPINS,
      spinsRemaining: Math.max(TOTAL_CAMPAIGN_SPINS - totalSpins, 0),
      inventory,
    });
  } catch (err) {
    console.error("GET /api/admin/stats failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
