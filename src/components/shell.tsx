import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { wilayas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Header, Footer, type UserDto } from "./site";

export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  let dto: UserDto | null = null;
  if (user) {
    let wilayaAr: string | null = null;
    let wilayaEn: string | null = null;
    if (user.wilayaId) {
      const rows = await db
        .select()
        .from(wilayas)
        .where(eq(wilayas.id, user.wilayaId))
        .limit(1);
      wilayaAr = rows[0]?.nameAr ?? null;
      wilayaEn = rows[0]?.nameEn ?? null;
    }
    dto = {
      id: user.id,
      nameAr: user.nameAr,
      nameEn: user.nameEn,
      orgAr: user.orgAr,
      orgEn: user.orgEn,
      role: user.role,
      email: user.email,
      walletDzd: Number(user.walletDzd),
      wilayaAr,
      wilayaEn,
    };
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={dto} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
