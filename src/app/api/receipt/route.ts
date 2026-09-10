import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { issueReceipt, pledgeReceipt, releasePledge } from "@/lib/engine";
import { getCurrentUser } from "@/lib/auth";
import type { Grade } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    if (body.action === "issue") {
      if (!["warehouse", "admin", "state"].includes(user.role))
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      const grade = String(body.grade) as Grade;
      if (!["A", "B", "C"].includes(grade))
        return NextResponse.json({ error: "BAD_GRADE" }, { status: 400 });
      const receipt = await issueReceipt({
        farmerId: Number(body.farmerId),
        coldStoreId:
          user.role === "warehouse" && body.coldStoreId === "mine"
            ? Number(body.coldStoreIdReal)
            : Number(body.coldStoreId),
        operatorId: user.id,
        grade,
        variety: String(body.variety || "Spunta"),
        quantityQuintals: Number(body.qty),
        qualityScore: Number(body.quality),
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, code: receipt.code });
    }
    if (body.action === "pledge") {
      if (user.role !== "bank" && user.role !== "admin")
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      await pledgeReceipt(Number(body.receiptId), user.role === "bank" ? user.id : Number(body.bankId));
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "release") {
      await releasePledge(Number(body.receiptId));
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ERROR" }, { status: 400 });
  }
}
