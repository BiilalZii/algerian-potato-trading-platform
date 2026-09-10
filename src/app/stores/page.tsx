import { cookies } from "next/headers";
import AppShell from "@/components/shell";
import { PageHead } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getStores, getNetworkTotals } from "@/lib/queries";
import { StoresView, type StoreDto } from "@/components/stores";
import { db } from "@/db";
import { wilayas } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);

  const [rows, totals, wRows] = await Promise.all([getStores(), getNetworkTotals(), db.select().from(wilayas)]);

  const stores: StoreDto[] = rows.map((r) => ({
    id: r.s.id,
    code: r.s.code,
    nameAr: r.s.nameAr,
    nameEn: r.s.nameEn,
    wilayaAr: r.w.nameAr,
    wilayaEn: r.w.nameEn,
    region: r.w.region,
    capacity: r.s.capacityQuintals,
    used: r.s.usedQuintals,
    temp: r.s.temperatureC,
    certified: r.s.certified,
    connected: r.s.connected,
    publicStore: r.s.publicStore,
  }));

  const producers = wRows.filter((w) => w.majorProducer);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHead icon="🧊" title={t("stores.title")} subtitle={t("stores.subtitle")} />

        <div className="card p-4 mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 me-2">📍 {t("stores.producerWilayas")}:</span>
          {producers.map((w) => (
            <span key={w.id} className="badge bg-emerald-50 text-emerald-800 ring-emerald-200">
              {lang === "ar" ? w.nameAr : w.nameEn}
            </span>
          ))}
        </div>

        <StoresView stores={stores} totals={totals} />
      </div>
    </AppShell>
  );
}
