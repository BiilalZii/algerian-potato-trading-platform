import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateBand, directIntervention } from "@/lib/engine";
import { getCurrentUser } from "@/lib/auth";
import type { Grade } from "@/db/schema";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "state" && user.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const grade = String(body.grade) as Grade;
  if (!["A", "B", "C"].includes(grade))
    return NextResponse.json({ error: "BAD_GRADE" }, { status: 400 });
  try {
    if (body.action === "band") {
      await updateBand(
        grade,
        Math.round(Number(body.floor)),
        Math.round(Number(body.ceiling)),
        Boolean(body.enabled),
        user.id,
        String(body.reasonAr || "تعديل نطاق التدخل"),
        String(body.reasonEn || "Band adjustment"),
      );
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "intervene") {
      const type = body.type === "sell" ? "sell" : "buy";
      await directIntervention(
        type,
        grade,
        Math.round(Number(body.price)),
        Math.round(Number(body.qty)),
        user.id,
        String(body.reasonAr || (type === "buy" ? "شراء لدعم السوق" : "بيع لتهدئة السوق")),
        String(body.reasonEn || (type === "buy" ? "Market support purchase" : "Market cooling sale")),
      );
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ERROR" }, { status: 400 });
  }
}
