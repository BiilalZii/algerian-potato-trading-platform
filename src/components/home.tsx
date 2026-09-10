"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { PriceHistoryChart, type PricePoint } from "./charts";
import { fmtInt, fmtTons, gradeLabel } from "@/lib/format";

export interface SettingDto {
  grade: "A" | "B" | "C";
  referencePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  marketMakerEnabled: boolean;
  stateStockQuintals: number;
  prevClose: number | null;
  todayVolume: number;
}

function ChangeChip({ now, prev, dir = "normal" }: { now: number; prev: number | null; dir?: string }) {
  const { lang } = useI18n();
  void dir;
  if (prev == null) return null;
  const diff = now - prev;
  const pct = prev ? ((diff / prev) * 100).toFixed(1) : "0.0";
  const up = diff > 0;
  const same = diff === 0;
  return (
    <span
      className={`badge ${
        same
          ? "bg-slate-100 text-slate-600 ring-slate-300"
          : up
            ? "bg-rose-100 text-rose-800 ring-rose-300"
            : "bg-emerald-100 text-emerald-800 ring-emerald-300"
      }`}
    >
      {same ? "=" : up ? "▲" : "▼"} {Math.abs(diff)} ({pct}%){" "}
      {lang === "ar" ? "أمس" : "d-1"}
    </span>
  );
}

export function Hero({ settings }: { settings: SettingDto[] }) {
  const { t, lang } = useI18n();
  return (
    <section className="relative overflow-hidden bg-[#004624] text-white pattern-bg">
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)" }} />
      <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <span className="badge bg-white/10 text-white ring-white/25 mb-5">
            🇩🇿 {t("landing.heroBadge")}
          </span>
          <h1 className="text-3xl md:text-5xl font-black leading-tight">{t("landing.heroTitle")}</h1>
          <p className="mt-4 text-white/80 text-base md:text-lg leading-relaxed max-w-2xl">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/trading" className="btn bg-white text-[#004624] hover:bg-emerald-50 px-6 py-3 text-base shadow-lg">
              📈 {t("landing.ctaTrade")}
            </Link>
            <Link href="/receipts" className="btn bg-white/10 text-white ring-white/30 hover:bg-white/20 px-6 py-3 text-base">
              🧾 {t("nav.receipts")}
            </Link>
            <Link href="/intervention" className="btn bg-[#d21034] text-white hover:bg-[#b40d2c] px-6 py-3 text-base">
              🏛️ {t("nav.intervention")}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {settings.map((s) => (
              <Link
                key={s.grade}
                href="/trading"
                className="rounded-xl bg-white/10 ring-1 ring-white/15 px-4 py-2.5 hover:bg-white/15 transition"
              >
                <div className="text-[10px] text-white/60 font-bold">{gradeLabel(s.grade, lang)}</div>
                <div className="text-lg font-black tabular-nums leading-tight">
                  {fmtInt(s.referencePrice)} <span className="text-[11px] font-bold text-white/60">{t("common.perKg")}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-white/[0.08] ring-1 ring-white/15 backdrop-blur p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-white/80 mb-4">
              <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              {t("common.live")} — {t("landing.marketTitle")}
            </div>
            {(() => {
              const b = settings.find((s) => s.grade === "B")!;
              return (
                <div>
                  <div className="text-white/60 text-sm">{gradeLabel("B", lang)}</div>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="text-6xl font-black tabular-nums">{b.referencePrice}</div>
                    <div className="pb-2">
                      <ChangeChip now={b.referencePrice} prev={b.prevClose} />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/10 p-3">
                      <div className="text-white/60 text-[11px] font-bold">{t("landing.floor")}</div>
                      <div className="font-black text-emerald-300 text-lg tabular-nums">{b.floorPrice}</div>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <div className="text-white/60 text-[11px] font-bold">{t("landing.ceiling")}</div>
                      <div className="font-black text-rose-300 text-lg tabular-nums">{b.ceilingPrice}</div>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <div className="text-white/60 text-[11px] font-bold">{t("landing.todayVolume")}</div>
                      <div className="font-black text-lg tabular-nums">{fmtInt(b.todayVolume)} q</div>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <div className="text-white/60 text-[11px] font-bold">{t("landing.stateStock")}</div>
                      <div className="font-black text-lg tabular-nums">
                        {fmtTons(settings.reduce((a, s) => a + s.stateStockQuintals, 0), lang)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MacroStats({ stockQuintals }: { stockQuintals: number }) {
  const { t, lang } = useI18n();
  const stats = [
    { label: t("landing.statProduction"), value: lang === "ar" ? "5–6 مليون طن" : "5–6M tons", sub: "~60M quintals · 2024–25" },
    { label: t("landing.statConsumption"), value: lang === "ar" ? "~5 ملايين طن" : "~5M tons", sub: lang === "ar" ? "فائض موسمي هيكلي" : "Structural seasonal surplus" },
    { label: t("landing.statStock"), value: fmtTons(stockQuintals, lang), sub: "ONILEV / SARPA" },
    { label: t("landing.statVolatility"), value: "25–80", sub: t("common.perKg") + (lang === "ar" ? " — قبل الضبط" : " — pre-regulation") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 -mt-8 relative z-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[11px] font-bold text-slate-400 leading-tight">{s.label}</div>
            <div className="text-xl md:text-2xl font-black text-[#004624] mt-1 tabular-nums">{s.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MarketSection({
  settings,
  series,
}: {
  settings: SettingDto[];
  series: Record<string, PricePoint[]>;
}) {
  const { t, lang } = useI18n();
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const s = settings.find((x) => x.grade === grade)!;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-black text-[#004624]">{t("landing.chartTitle")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("landing.chartSubtitle")}</p>
        </div>
        <div className="flex gap-1.5">
          {(["A", "B", "C"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`btn px-4 py-2 text-xs ${
                grade === g ? "bg-[#006233] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {gradeLabel(g, lang)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 card p-5">
          <PriceHistoryChart data={series[grade]} height={340} />
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#006233]" /> {t("landing.refPrice")}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#d21034]" /> {t("landing.ceiling")}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#0a8a4e]" /> {t("landing.floor")}</span>
            <span className="flex items-center gap-1.5">⚑ {lang === "ar" ? "يوم تدخلت فيه الدولة" : "State intervention day"}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-[11px] font-bold text-slate-400">{t("landing.refPrice")}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black tabular-nums">{s.referencePrice}</span>
              <ChangeChip now={s.referencePrice} prev={s.prevClose} />
            </div>
          </div>
          <div className="card p-4">
            <div className="text-[11px] font-bold text-slate-400">{t("landing.todayVolume")}</div>
            <div className="text-2xl font-black mt-1 tabular-nums">{fmtInt(s.todayVolume)} q</div>
            <div className="text-[11px] text-slate-400">{fmtTons(s.todayVolume, lang)}</div>
          </div>
          <div className="card p-4">
            <div className="text-[11px] font-bold text-slate-400">{t("landing.stateStock")} — {s.grade}</div>
            <div className="text-2xl font-black mt-1 tabular-nums">{fmtInt(s.stateStockQuintals)} q</div>
            <div className="text-[11px] text-slate-400">{fmtTons(s.stateStockQuintals, lang)}</div>
          </div>
          <Link href="/trading" className="btn-primary w-full">{t("landing.ctaTrade")} →</Link>
        </div>
      </div>
    </section>
  );
}

const COMPONENTS = [
  { icon: "📊", key: "cSpotTitle", text: "cSpotText", href: "/trading", color: "from-emerald-500 to-emerald-700" },
  { icon: "🧾", key: "cReceiptTitle", text: "cReceiptText", href: "/receipts", color: "from-teal-500 to-teal-700" },
  { icon: "🏛️", key: "cMmTitle", text: "cMmText", href: "/intervention", color: "from-rose-500 to-rose-700" },
  { icon: "🔬", key: "cQualityTitle", text: "cQualityText", href: "/stores", color: "from-amber-500 to-amber-700" },
  { icon: "🔗", key: "cIntegrationTitle", text: "cIntegrationText", href: "#", color: "from-sky-500 to-sky-700" },
];

export function Components() {
  const { t } = useI18n();
  return (
    <section className="bg-white border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-black text-[#004624]">{t("landing.componentsTitle")}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-7">{t("landing.componentsSubtitle")}</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {COMPONENTS.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${c.color} text-white grid place-items-center text-xl mb-3`}>
                {c.icon}
              </div>
              <div className="font-extrabold text-[#004624] text-sm leading-snug group-hover:text-[#0a8a4e]">
                {t(`landing.${c.key}`)}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{t(`landing.${c.text}`)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const PHASES = [
  { n: "1", months: "3–4", t: "phase1Title", d: "phase1Text", icon: "📋" },
  { n: "2", months: "6–8", t: "phase2Title", d: "phase2Text", icon: "🛠️" },
  { n: "3", months: "4–6", t: "phase3Title", d: "phase3Text", icon: "🧪" },
  { n: "4", months: "5–6", t: "phase4Title", d: "phase4Text", icon: "🇩🇿" },
];

export function Roadmap() {
  const { t, lang } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <h2 className="text-2xl font-black text-[#004624]">{t("landing.roadmapTitle")}</h2>
      <div className="relative mt-8 grid md:grid-cols-4 gap-4">
        <div className="hidden md:block absolute top-7 start-8 end-8 h-1 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-600 rounded-full" />
        {PHASES.map((p) => (
          <div key={p.n} className="relative card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative h-14 w-14 rounded-2xl bg-[#006233] text-white grid place-items-center text-2xl font-black shadow-md">
                {p.n}
              </div>
              <div className="text-2xl">{p.icon}</div>
            </div>
            <div className="font-extrabold text-sm text-[#004624] leading-snug">{t(`landing.${p.t}`)}</div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{t(`landing.${p.d}`)}</p>
            <div className="mt-3 text-[11px] font-bold text-emerald-700">
              {p.months} {lang === "ar" ? "أشهر" : "months"}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <div className="card p-6 border-s-4 border-s-[#006233]" style={{ borderInlineStartWidth: 4, borderInlineStartColor: "#006233" }}>
          <div className="font-extrabold text-[#004624] mb-1.5">⚖️ {t("landing.legalTitle")}</div>
          <p className="text-sm text-slate-600 leading-relaxed">{t("landing.legalText")}</p>
        </div>
        <div className="card p-6" style={{ borderInlineStartWidth: 4, borderInlineStartColor: "#d21034" }}>
          <div className="font-extrabold text-[#004624] mb-1.5">📶 {t("landing.offlineTitle")}</div>
          <p className="text-sm text-slate-600 leading-relaxed">{t("landing.offlineText")}</p>
        </div>
      </div>
    </section>
  );
}
