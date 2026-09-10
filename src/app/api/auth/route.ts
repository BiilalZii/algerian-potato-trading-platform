import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "INVALID" }, { status: 401 });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "INVALID" }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
