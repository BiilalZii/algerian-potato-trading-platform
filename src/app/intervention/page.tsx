import { cookies } from "next/headers";
import AppShell from "@/components/shell";
import { PageHead } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, getSeries, getInterventions } from "@/lib/queries";
import { InterventionView, type SettingDto3, type InterventionDto } from "@/components/intervention";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function InterventionPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const user = await getCurrentUser();
  const canEdit = user?.role === "state" || user?.role === "admin";

  const [settingsRows, intervRows] = await Promise.all([
    getSettings(),
    getInterventions(30),
  ]);
  const series: Record<string, Awaited<ReturnType<typeof getSeries>>> = {};
  for (const g of ["A", "B", "C"] as const) series[g] = await getSeries(g, 90);

  const settings: SettingDto3[] = settingsRows.map((s) => ({
    grade: s.grade as "A" | "B" | "C",
    referencePrice: s.referencePrice,
    floorPrice: s.floorPrice,
    ceilingPrice: s.ceilingPrice,
    marketMakerEnabled: s.marketMakerEnabled,
    stateStockQuintals: s.stateStockQuintals,
  }));

  const history: InterventionDto[] = intervRows.map((r) => ({
    id: r.i.id,
    type: r.i.type,
    grade: r.i.grade as "A" | "B" | "C",
    price: r.i.price,
    qty: r.i.quantityQuintals,
    floor: r.i.floorPrice,
    ceiling: r.i.ceilingPrice,
    before: r.i.beforePrice,
    after: r.i.afterPrice,
    stockAfter: r.i.stateStockAfter ?? 0,
    reasonAr: r.i.reasonAr,
    reasonEn: r.i.reasonEn,
    createdAt: r.i.createdAt.toISOString(),
  }));

  const stateRows = await db.select().from(users).where(eq(users.role, "state")).limit(1);
  const treasury = Number(stateRows[0]?.walletDzd ?? 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHead icon="🏛️" title={t("intervention.title")} subtitle={t("intervention.subtitle")} />
        <InterventionView
          settings={settings}
          series={series}
          history={history}
          treasury={treasury}
          canEdit={!!canEdit}
        />
      </div>
    </AppShell>
  );
}
