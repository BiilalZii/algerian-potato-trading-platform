import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { placeBid, settleAuction } from "@/lib/engine";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    if (body.action === "bid") {
      await placeBid(
        Number(body.auctionId),
        user.id,
        Number(body.price),
        Number(body.qty),
      );
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "settle") {
      if (user.role !== "state" && user.role !== "admin")
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      const res = await settleAuction(Number(body.auctionId));
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, ...res });
    }
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ERROR" }, { status: 400 });
  }
}
