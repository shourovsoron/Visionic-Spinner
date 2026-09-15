import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/lib/models/Participant";
import { isAuthenticatedRequest } from "@/lib/adminAuth";
import { PRIZE_LABELS, isPrizeType } from "@/lib/prizeTypes";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const participants = await Participant.find({})
      .sort({ createdAt: -1 })
      .select("phone email customerType website lookingForDesign prize couponCode createdAt")
      .lean();

    const header = [
      "Phone",
      "Email",
      "Customer Type",
      "Website",
      "Looking for Design Services",
      "Prize",
      "Coupon Code",
      "Created At",
    ];

    const rows = participants.map((p) => [
      p.phone,
      p.email,
      p.customerType,
      p.website ?? "",
      p.lookingForDesign,
      isPrizeType(p.prize) ? PRIZE_LABELS[p.prize] : p.prize,
      p.couponCode ?? "",
      new Date(p.createdAt).toISOString(),
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="spin-and-win-participants-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/export failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
