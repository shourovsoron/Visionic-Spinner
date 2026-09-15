import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/lib/models/Participant";
import { isAuthenticatedRequest } from "@/lib/adminAuth";
import { isPrizeType } from "@/lib/prizeTypes";

const SORTABLE_FIELDS = new Set(["createdAt", "email", "phone", "prize", "customerType"]);
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20)
    );
    const search = (searchParams.get("search") ?? "").trim();
    const prizeFilter = searchParams.get("prize") ?? "";
    const customerTypeFilter = searchParams.get("customerType") ?? "";
    const sortFieldParam = searchParams.get("sortField") ?? "createdAt";
    const sortField = SORTABLE_FIELDS.has(sortFieldParam) ? sortFieldParam : "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;

    const query: Record<string, unknown> = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ email: regex }, { phone: regex }];
    }

    if (prizeFilter && isPrizeType(prizeFilter)) {
      query.prize = prizeFilter;
    }

    if (customerTypeFilter === "individual" || customerTypeFilter === "business") {
      query.customerType = customerTypeFilter;
    }

    const [items, total] = await Promise.all([
      Participant.find(query)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("phone email customerType website lookingForDesign prize couponCode createdAt")
        .lean(),
      Participant.countDocuments(query),
    ]);

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("GET /api/admin/participants failed", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
