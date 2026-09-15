import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/lib/models/Participant";
import { PrizeInventory } from "@/lib/models/PrizeInventory";
import { validateSpinInput, type SpinFormInput } from "@/lib/validation";
import { reserveSpin } from "@/lib/prizeEngine";
import { PRIZE_LABELS, isPrizeType } from "@/lib/prizeTypes";
import { createParticipantToken, readParticipantId, PARTICIPANT_COOKIE } from "@/lib/participantSession";

export const dynamic = "force-dynamic";

async function isCampaignExhausted(): Promise<boolean> {
  const remaining = await PrizeInventory.aggregate([
    { $group: { _id: null, total: { $sum: "$remainingQuantity" } } },
  ]);
  const total = remaining[0]?.total ?? 0;
  return total <= 0;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const exhausted = await isCampaignExhausted();
    const participantId = readParticipantId(req);
    if (!participantId) {
      return NextResponse.json({ participated: false, exhausted });
    }

    const participant = await Participant.findById(participantId).select(
      "prize couponCode"
    );

    if (!participant || !isPrizeType(participant.prize)) {
      return NextResponse.json({ participated: false, exhausted });
    }

    return NextResponse.json({
      participated: true,
      exhausted,
      prize: participant.prize,
      prizeLabel: PRIZE_LABELS[participant.prize],
      couponCode: participant.couponCode ?? null,
    });
  } catch (err) {
    console.error("GET /api/spin failed", err);
    return NextResponse.json({ participated: false });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const input = body as Partial<SpinFormInput>;
  const { valid, errors, data } = validateSpinInput({
    fullName: input.fullName ?? "",
    phone: input.phone ?? "",
    email: input.email ?? "",
    customerType: input.customerType ?? "",
    website: input.website ?? "",
    lookingForDesign: input.lookingForDesign ?? "",
  });

  if (!valid || !data) {
    return NextResponse.json(
      { success: false, message: "Please correct the highlighted fields.", errors },
      { status: 422 }
    );
  }

  try {
    await connectToDatabase();
    const outcome = await reserveSpin(data);

    if (outcome.status === "already_participated") {
      return NextResponse.json(
        { success: false, code: "ALREADY_PARTICIPATED", message: "You have already participated in this campaign." },
        { status: 409 }
      );
    }

    if (outcome.status === "exhausted") {
      return NextResponse.json(
        { success: false, code: "CAMPAIGN_EXHAUSTED", message: "Sorry, all spins have been claimed." },
        { status: 410 }
      );
    }

    const participant = await Participant.findOne({ email: data.email }).select("_id");

    const response = NextResponse.json({
      success: true,
      prize: outcome.prize,
      prizeLabel: PRIZE_LABELS[outcome.prize],
      couponCode: outcome.couponCode ?? null,
    });

    if (participant) {
      response.cookies.set(PARTICIPANT_COOKIE, createParticipantToken(String(participant._id)), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error("POST /api/spin failed", err);
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
