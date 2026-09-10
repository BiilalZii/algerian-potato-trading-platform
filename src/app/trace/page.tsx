import { cookies, headers } from "next/headers";
import Link from "next/link";
import AppShell from "@/components/shell";
import { PageHead, GradeBadge, StatusPill } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getTrace } from "@/lib/queries";
import { gradeLabel, localName, fmtInt, fmtDate, fmtDzd } from "@/lib/format";

export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {
  harvest: "🌾",
  inspection: "🔬",
  intake: "🚚",
  storage: "🧊",
  receipt: "🧾",
  pledge: "🏦",
  traded: "📈",
  delivery: "🏪",
};

function SearchBox({ initial, placeholder, label, tryCode }: { initial: string; placeholder: string; label: string; tryCode: string }) {
  return (
    <form action="/trace" className="card p-3 flex flex-wrap items-center gap-2">
      <input
        name="code"
        defaultValue={initial}
        placeholder={placeholder}
        className="input flex-1 min-w-[240px] font-mono"
      />
      <button className="btn-primary" type="submit">
        🔍 {label}
      </button>
      <Link href={`/trace?code=${tryCode}`} className="btn-ghost text-xs">
        LOT-00001
      </Link>
    </form>
  );
}

export default async function TracePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const jar = await cookies();
  void headers;
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const sp = await searchParams;
  const code = sp.code ?? "";
  const result = code ? await getTrace(code) : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <PageHead icon="🔎" title={t("trace.title")} subtitle={t("trace.subtitle")} />
        <SearchBox initial={code} placeholder={t("trace.placeholder")} label={t("trace.search")} tryCode="LOT-00001" />

        {code && !result && (
          <div className="card p-8 text-center text-rose-600 font-bold mt-6">⚠️ {t("trace.notFound")}</div>
        )}

        {result && (
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {/* lot card */}
            <div className="card p-5 h-fit">
              <div className="text-xs font-bold text-slate-400 mb-1">{t("trace.lotInfo")}</div>
              <div className="font-mono text-lg font-black text-[#004624]">{result.lot.code}</div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t("receipts.farmer")}</span><span className="font-bold text-end">{localName(result.farmer.nameAr, result.farmer.nameEn, lang)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t("common.wilaya")}</span><span className="font-bold">{localName(result.wilaya.nameAr, result.wilaya.nameEn, lang)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t("common.variety")}</span><span className="font-bold">{result.lot.variety}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400 text-xs">{t("common.grade")}</span><GradeBadge grade={result.lot.grade} label={gradeLabel(result.lot.grade, lang)} /></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t("common.quantity")}</span><span className="font-bold tabular-nums">{fmtInt(result.lot.quantityQuintals)} q</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t("receipts.qualityScore")}</span><span className="font-bold tabular-nums">{result.lot.qualityScore}/100</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t("common.status")}</span><StatusPill status={t(`common.${result.lot.inspection}`)} tone="green" /></div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 mb-2">🧾 {t("nav.receipts")}</div>
                {result.receipts.map((r) => (
                  <div key={r.r.id} className="rounded-xl bg-slate-50 p-3 mb-2 text-xs">
                    <div className="font-mono font-black text-[#004624]">{r.r.code}</div>
                    <div className="text-slate-500 mt-0.5">{localName(r.s.nameAr, r.s.nameEn, lang)}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <StatusPill status={t(`common.${r.r.status}`)} tone={r.r.status === "active" ? "green" : r.r.status === "pledged" ? "amber" : "blue"} />
                      <span className="text-slate-500">{localName(r.h.nameAr, r.h.nameEn, lang)}</span>
                    </div>
                    {r.r.pledgeAmountDzd != null && (
                      <div className="mt-1 font-black text-amber-700 tabular-nums">{fmtDzd(Number(r.r.pledgeAmountDzd), lang)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* timeline */}
            <div className="md:col-span-2 card p-6">
              <div className="font-extrabold text-[#004624] mb-5">🛤️ {t("trace.journey")}</div>
              <ol className="relative border-s-2 border-dashed border-emerald-200" style={{ borderInlineStartWidth: 2, borderInlineStartStyle: "dashed" }}>
                {result.events.map((e, i) => {
                  const last = i === result.events.length - 1;
                  return (
                    <li key={e.id} className="ms-5 pb-6 relative">
                      <span
                        className={`absolute -start-[33px] grid place-items-center h-8 w-8 rounded-full ring-4 ring-white text-sm ${
                          last ? "bg-[#006233]" : "bg-emerald-100"
                        }`}
                      >
                        {ICONS[e.type] ?? "📍"}
                      </span>
                      <div className={`rounded-xl p-3 ${last ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50"}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-[#004624]">
                            {localName(e.labelAr, e.labelEn, lang)}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">{fmtDate(e.createdAt, lang)}</span>
                        </div>
                        {(e.locationAr || e.locationEn) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            📍 {localName(e.locationAr, e.locationEn, lang)}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
