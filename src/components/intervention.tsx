"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { PriceHistoryChart, type PricePoint } from "./charts";
import { GradeBadge } from "./site";
import { fmtInt, fmtDzd, fmtQty, fmtTons, fmtDateTime, gradeLabel, localName } from "@/lib/format";

export interface SettingDto3 {
  grade: "A" | "B" | "C";
  referencePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  marketMakerEnabled: boolean;
  stateStockQuintals: number;
}
export interface InterventionDto {
  id: number;
  type: "buy" | "sell" | "set_band";
  grade: "A" | "B" | "C";
  price: number | null;
  qty: number;
  floor: number | null;
  ceiling: number | null;
  before: number | null;
  after: number | null;
  stockAfter: number;
  reasonAr: string;
  reasonEn: string;
  createdAt: string;
}

export function InterventionView({
  settings,
  series,
  history,
  treasury,
  canEdit,
}: {
  settings: SettingDto3[];
  series: Record<string, PricePoint[]>;
  history: InterventionDto[];
  treasury: number;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const s = settings.find((x) => x.grade === grade)!;
  const [floor, setFloor] = useState(String(s.floorPrice));
  const [ceil, setCeil] = useState(String(s.ceilingPrice));
  const [enabled, setEnabled] = useState(s.marketMakerEnabled);
  const [buyPrice, setBuyPrice] = useState(String(s.floorPrice));
  const [sellPrice, setSellPrice] = useState(String(s.ceilingPrice));
  const [buyQty, setBuyQty] = useState("1000");
  const [sellQty, setSellQty] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const cur = settings.find((x) => x.grade === grade)!;
    setFloor(String(cur.floorPrice));
    setCeil(String(cur.ceilingPrice));
    setEnabled(cur.marketMakerEnabled);
    setBuyPrice(String(cur.floorPrice));
    setSellPrice(String(cur.ceilingPrice));
  }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  async function call(body: Record<string, unknown>, ok: string) {
    if (!canEdit) return;
    setBusy(true);
    const r = await fetch("/api/intervention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, ...body }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? ok : j.error);
    if (j.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {!canEdit && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-300 text-amber-900 text-sm font-bold p-3">
          🔒 {t("intervention.accessDenied")}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-4">
        {/* settings + actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-[#004624] text-sm">🏛️ {t("intervention.bandTitle")}</div>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as any)}
                className="input !w-auto !py-1.5 text-xs font-bold"
              >
                {settings.map((x) => (
                  <option key={x.grade} value={x.grade}>{gradeLabel(x.grade, lang)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label text-emerald-800">↧ {t("intervention.floorLabel")}</label>
                <input type="number" disabled={!canEdit} className="input tabular-nums" value={floor} onChange={(e) => setFloor(e.target.value)} />
              </div>
              <div>
                <label className="label text-rose-800">↥ {t("intervention.ceilingLabel")}</label>
                <input type="number" disabled={!canEdit} className="input tabular-nums" value={ceil} onChange={(e) => setCeil(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-700"
                  checked={enabled}
                  disabled={!canEdit}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                {enabled ? t("intervention.mmOn") : t("intervention.mmOff")}
              </label>
              <button
                disabled={!canEdit || busy}
                onClick={() =>
                  call(
                    { action: "band", floor: Number(floor), ceiling: Number(ceil), enabled,
                      reasonAr: t("intervention.bandReason"), reasonEn: "Band adjustment" },
                    t("intervention.bandUpdated"),
                  )
                }
                className="btn-primary w-full"
              >
                {t("intervention.saveBand")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 border-s-4 border-emerald-600" style={{ borderInlineStartWidth: 4, borderInlineStartColor: "#059669" }}>
              <div className="text-[10px] font-bold text-slate-400">{t("intervention.buyAction")}</div>
              <input type="number" disabled={!canEdit} className="input mt-1 !px-2 !py-1.5 text-xs tabular-nums" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
              <input type="number" disabled={!canEdit} className="input mt-2 !px-2 !py-1.5 text-xs tabular-nums" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} />
              <div className="text-[10px] text-slate-400 mt-1">{t("intervention.buyHint")}</div>
              <button
                disabled={!canEdit || busy}
                onClick={() =>
                  call({ action: "intervene", type: "buy", price: Number(buyPrice), qty: Number(buyQty),
                    reasonAr: t("intervention.buyHint"), reasonEn: "Market support purchase" }, t("intervention.executed"))
                }
                className="btn-buy w-full mt-2 text-xs !py-2"
              >
                🟢 {t("intervention.buyAction")}
              </button>
            </div>
            <div className="card p-4" style={{ borderInlineStartWidth: 4, borderInlineStartColor: "#e11d48" }}>
              <div className="text-[10px] font-bold text-slate-400">{t("intervention.sellAction")}</div>
              <input type="number" disabled={!canEdit} className="input mt-1 !px-2 !py-1.5 text-xs tabular-nums" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
              <input type="number" disabled={!canEdit} className="input mt-2 !px-2 !py-1.5 text-xs tabular-nums" value={sellQty} onChange={(e) => setSellQty(e.target.value)} />
              <div className="text-[10px] text-slate-400 mt-1">{t("intervention.sellHint")}</div>
              <button
                disabled={!canEdit || busy}
                onClick={() =>
                  call({ action: "intervene", type: "sell", price: Number(sellPrice), qty: Number(sellQty),
                    reasonAr: t("intervention.sellHint"), reasonEn: "Market cooling sale" }, t("intervention.executed"))
                }
                className="btn-sell w-full mt-2 text-xs !py-2"
              >
                🔴 {t("intervention.sellAction")}
              </button>
            </div>
          </div>

          <div className="card p-4 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[10px] font-bold text-slate-400">{t("intervention.strategicStock")} — {grade}</div>
              <div className="text-xl font-black text-[#004624] tabular-nums">{fmtInt(s.stateStockQuintals)}</div>
              <div className="text-[10px] text-slate-400">{fmtTons(s.stateStockQuintals, lang)} · q</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">{t("intervention.treasury")}</div>
              <div className="text-xl font-black text-[#004624] tabular-nums">{fmtDzd(treasury, lang)}</div>
            </div>
          </div>
          {msg && <div className="text-xs font-bold rounded-lg bg-slate-50 p-2 text-slate-700">{msg}</div>}
        </div>

        {/* chart + ref */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="font-extrabold text-[#004624] text-sm">📈 {s.grade} — {t("intervention.protected")}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="badge bg-emerald-50 text-emerald-800 ring-emerald-200">{t("intervention.floorLabel")}: {s.floorPrice}</span>
                <span className="badge bg-rose-50 text-rose-800 ring-rose-200">{t("intervention.ceilingLabel")}: {s.ceilingPrice}</span>
                <span className="badge bg-slate-100 text-slate-700 ring-slate-300">{t("landing.refPrice")}: {s.referencePrice}</span>
              </div>
            </div>
            <PriceHistoryChart data={series[grade]} height={330} />
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624]">
              📜 {t("intervention.history")}
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="th">{t("intervention.type")}</th>
                    <th className="th">{t("common.grade")}</th>
                    <th className="th text-end">{t("common.price")}</th>
                    <th className="th text-end">{t("common.quantity")}</th>
                    <th className="th text-end">{t("intervention.beforeAfter")}</th>
                    <th className="th">{t("intervention.stockImpact")}</th>
                    <th className="th">{t("intervention.reason")}</th>
                    <th className="th">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-slate-50 align-top">
                      <td className="td">
                        {h.type === "buy" ? (
                          <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-300">🟢 {t("common.buy")}</span>
                        ) : h.type === "sell" ? (
                          <span className="badge bg-rose-100 text-rose-800 ring-rose-300">🔴 {t("common.sell")}</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-700 ring-slate-300">↔ {t("intervention.bandTitle")}</span>
                        )}
                      </td>
                      <td className="td"><GradeBadge grade={h.grade} label={h.grade} /></td>
                      <td className="td text-end tabular-nums">{h.price != null ? fmtInt(h.price) : `${h.floor}–${h.ceiling}`}</td>
                      <td className="td text-end tabular-nums">{h.qty ? fmtQty(h.qty, lang) : "—"}</td>
                      <td className="td text-end tabular-nums text-xs">
                        {h.before != null ? `${h.before} → ` : ""}{h.after != null ? <b>{h.after}</b> : "—"}
                      </td>
                      <td className="td text-xs tabular-nums">{fmtTons(h.stockAfter, lang)}</td>
                      <td className="td text-xs text-slate-500 max-w-[220px]">{localName(h.reasonAr, h.reasonEn, lang)}</td>
                      <td className="td text-[11px] text-slate-400 whitespace-nowrap">{fmtDateTime(h.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
