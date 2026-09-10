import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/shell";
import { makeT, type Lang } from "@/lib/dict";
import { getCurrentUser } from "@/lib/auth";
import { LoginView, type Persona } from "@/components/login";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const current = await getCurrentUser();
  if (current) redirect("/dashboard");

  const rows = await db
    .select()
    .from(users)
    .orderBy(asc(users.id));

  const personas: Persona[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    nameAr: u.nameAr,
    nameEn: u.nameEn,
    orgAr: u.orgAr,
    orgEn: u.orgEn,
    role: u.role,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-black text-[#004624]">{t("login.title")}</h1>
          <p className="text-sm text-slate-500 mt-2">{t("login.subtitle")}</p>
        </div>
        <LoginView personas={personas} />
      </div>
    </AppShell>
  );
}
