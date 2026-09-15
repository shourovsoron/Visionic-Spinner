import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedRequest, verifyAdminPassword } from "@/lib/adminAuth";
import { deleteParticipantsAndRestorePrizes } from "@/lib/prizeEngine";

const MAX_BULK_DELETE = 500;

export async function POST(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const { ids, password } = (body ?? {}) as { ids?: unknown; password?: unknown };

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ message: "Password is required." }, { status: 422 });
  }

  // Verified server-side against the env credential — the frontend cannot bypass this
  // by, say, hiding the password field or calling this endpoint directly.
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ message: "No participants selected." }, { status: 422 });
  }

  const stringIds = ids.filter((id): id is string => typeof id === "string");
  if (stringIds.length === 0) {
    return NextResponse.json({ message: "No valid participant ids provided." }, { status: 422 });
  }

  if (stringIds.length > MAX_BULK_DELETE) {
    return NextResponse.json(
      { message: `Cannot delete more than ${MAX_BULK_DELETE} participants at once.` },
      { status: 422 }
    );
  }

  try {
    const result = await deleteParticipantsAndRestorePrizes(stringIds);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      restoredByPrize: result.restoredByPrize,
      notFoundIds: result.notFoundIds,
    });
  } catch (err) {
    console.error("POST /api/admin/participants/bulk-delete failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
