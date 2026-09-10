import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  marketTick,
  placeOrder,
  cancelOrder,
} from "@/lib/engine";
import { getCurrentUser } from "@/lib/auth";
import type { Grade } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "tick") {
      await marketTick();
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (body.action === "place") {
      const grade = String(body.grade) as Grade;
      if (!["A", "B", "C"].includes(grade)) return NextResponse.json({ error: "BAD_GRADE" }, { status: 400 });
      const order = await placeOrder({
        userId: user.id,
        side: body.side === "sell" ? "sell" : "buy",
        grade,
        quantityQuintals: Number(body.qty),
        price: Number(body.price),
        receiptId: body.receiptId ? Number(body.receiptId) : null,
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, ref: order.ref });
    }

    if (body.action === "cancel") {
      await cancelOrder(
        Number(body.id),
        user.id,
        user.role === "admin" || user.role === "state",
      );
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ERROR" }, { status: 400 });
  }
}
