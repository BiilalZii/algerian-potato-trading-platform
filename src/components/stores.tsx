"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { fmtInt, fmtTons, localName } from "@/lib/format";

export interface StoreDto {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  wilayaAr: string;
  wilayaEn: string;
  region: string;
  capacity: number;
  used: number;
  temp: string;
  certified: boolean;
  connected: boolean;
  publicStore: boolean;
}

function UtilBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = Math.min(100, Math.round((used / capacity) * 100));
  const color = pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
        <span>{pct}%</span>
        <span>{fmtInt(capacity - used)} q</span>
      </div>
    </div>
  );
}

export function StoresView({ stores, totals }: { stores: StoreDto[]; totals: { capacity: number; used: number; count: number } }) {
  const { t, lang } = useI18n();
  const [region, setRegion] = useState<"all" | "coastal" | "desert" | "highlands">("all");
  const [onlyPublic, setOnlyPublic] = useState(false);

  const filtered = stores.filter(
    (s) => (region === "all" || s.region === region) && (!onlyPublic || s.publicStore),
  );

  const regionLabel = (r: string) =>
    r === "desert" ? t("stores.desert") : r === "coastal" ? t("stores.coastal") : t("stores.highlands");

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t("stores.capacity"), value: `${fmtInt(totals.capacity)} q`, sub: fmtTons(totals.capacity, lang) },
          { label: t("stores.used"), value: `${fmtInt(totals.used)} q`, sub: fmtTons(totals.used, lang) },
          { label: t("stores.available"), value: `${fmtInt(totals.capacity - totals.used)} q`, sub: fmtTons(totals.capacity - totals.used, lang) },
          { label: t("stores.storesCount"), value: String(totals.count), sub: t("stores.online") + " ✓" },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-[11px] font-bold text-slate-400">{k.label}</div>
            <div className="text-2xl font-black text-[#004624] mt-1 tabular-nums">{k.value}</div>
            <div className="text-[11px] text-slate-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "coastal", "desert", "highlands"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`btn px-3.5 py-2 text-xs ${region === r ? "bg-[#006233] text-white" : "bg-white ring-1 ring-slate-200 text-slate-600"}`}
          >
            {r === "all" ? t("common.all") : regionLabel(r)}
          </button>
        ))}
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <button
          onClick={() => setOnlyPublic((v) => !v)}
          className={`btn px-3.5 py-2 text-xs ${onlyPublic ? "bg-[#d21034] text-white" : "bg-white ring-1 ring-slate-200 text-slate-600"}`}
        >
          🏛️ {t("stores.public")}
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-[#004624] text-sm">{localName(s.nameAr, s.nameEn, lang)}</div>
                <div className="text-[11px] text-slate-400 font-mono">{s.code} · {localName(s.wilayaAr, s.wilayaEn, lang)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`badge ${s.publicStore ? "bg-red-50 text-red-700 ring-red-200" : "bg-sky-50 text-sky-700 ring-sky-200"}`}>
                  {s.publicStore ? `🏛️ ${t("stores.public")}` : t("stores.private")}
                </span>
                <span className="badge bg-emerald-50 text-emerald-700 ring-emerald-200">
                  {s.connected ? `🟢 ${t("stores.online")}` : "⚪"}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <UtilBar used={s.used} capacity={s.capacity} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] font-bold text-slate-400">{t("stores.capacity")}</div>
                <div className="text-sm font-black tabular-nums">{fmtInt(s.capacity)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] font-bold text-slate-400">{t("stores.used")}</div>
                <div className="text-sm font-black tabular-nums">{fmtInt(s.used)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] font-bold text-slate-400">{t("stores.temperature")}</div>
                <div className="text-sm font-black tabular-nums">{s.temp}°C</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
