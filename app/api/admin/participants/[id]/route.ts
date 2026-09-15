import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/adminAuth";
import { deleteParticipantsAndRestorePrizes } from "@/lib/prizeEngine";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await deleteParticipantsAndRestorePrizes([id]);

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Participant not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      restoredByPrize: result.restoredByPrize,
    });
  } catch (err) {
    console.error("DELETE /api/admin/participants/[id] failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
