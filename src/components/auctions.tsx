"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { GradeBadge, StatusPill } from "./site";
import { fmtInt, fmtQty, gradeLabel, localName, fmtDateTime } from "@/lib/format";

export interface LiveBidDto {
  id: number;
  price: number;
  quantityQuintals: number;
  createdAt: string;
  userNameAr: string;
  userNameEn: string;
  userRole: string;
  mine: boolean;
}
export interface LiveAuctionDto {
  id: number;
  code: string;
  grade: "A" | "B" | "C";
  quantityQuintals: number;
  scheduledAt: string;
  noteAr: string | null;
  noteEn: string | null;
  sellerAr: string;
  sellerEn: string;
  bids: LiveBidDto[];
}
export interface PastAuctionDto {
  id: number;
  code: string;
  grade: "A" | "B" | "C";
  quantityQuintals: number;
  scheduledAt: string;
  settlePrice: number | null;
  sellerAr: string | null;
  sellerEn: string | null;
  winnerAr: string | null;
  winnerEn: string | null;
}

function Countdown({ target }: { target: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(h);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-2 tabular-nums">
      {[
        [h, "h"],
        [m, "m"],
        [s, "s"],
      ].map(([v, l], i) => (
        <div key={i} className="rounded-xl bg-[#004624] text-white px-3 py-2 text-center min-w-[58px]">
          <div className="text-xl font-black">{String(v).padStart(2, "0")}</div>
          <div className="text-[9px] text-white/60 font-bold">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function AuctionsView({
  live,
  past,
  loggedIn,
  isState,
}: {
  live: LiveAuctionDto | null;
  past: PastAuctionDto[];
  loggedIn: boolean;
  isState: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const leading = live?.bids[0]?.price;
  useEffect(() => {
    if (live) {
      setPrice(String((live.bids[0]?.price ?? 0) + 1));
      setQty(String(live.quantityQuintals));
    }
  }, [live?.id]); // eslint-disable-line

  async function bid() {
    if (!live) return;
    setBusy(true);
    const r = await fetch("/api/auction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bid", auctionId: live.id, price: Number(price), qty: Number(qty) }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? t("auctions.bidPlaced") : j.error);
    if (j.ok) router.refresh();
  }

  async function settle() {
    if (!live) return;
    setBusy(true);
    const r = await fetch("/api/auction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle", auctionId: live.id }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? `${t("auctions.settledOk")} · ${j.price} ${t("common.perKg")}` : j.error);
    if (j.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      {live ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="bg-gradient-to-l from-[#004624] to-[#0a8a4e] text-white p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                  {t("auctions.liveAuction")} · <span className="font-mono">{live.code}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <GradeBadge grade={live.grade} label={gradeLabel(live.grade, lang)} />
                  <span className="text-2xl font-black tabular-nums">{fmtInt(live.quantityQuintals)} q</span>
                </div>
                <div className="text-xs text-white/70 mt-1">{lang === "ar" ? live.noteAr : live.noteEn}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-white/60 font-bold mb-1.5">{t("auctions.remaining")}</div>
                <Countdown target={live.scheduledAt} />
              </div>
            </div>
            <div className="p-5 grid sm:grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] font-bold text-slate-400">{t("auctions.seller")}</div>
                <div className="text-sm font-bold mt-0.5">{localName(live.sellerAr, live.sellerEn, lang)}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400">{t("auctions.leadingBid")}</div>
                <div className="text-2xl font-black text-[#006233] tabular-nums mt-0.5">
                  {leading != null ? `${fmtInt(leading)}` : "—"}
                  {leading != null && <span className="text-xs text-slate-400 font-bold"> {t("common.perKg")}</span>}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400">{t("auctions.bidCount")}</div>
                <div className="text-2xl font-black tabular-nums mt-0.5">{live.bids.length}</div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="text-[11px] font-bold text-slate-400 mb-2">{t("common.recentTrades")} / {t("auctions.placeBid")}</div>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {live.bids.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                      b.mine ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50"
                    }`}
                  >
                    <span className="font-bold">{localName(b.userNameAr, b.userNameEn, lang)} {b.mine && "★"}</span>
                    <span className="tabular-nms tabular-nums font-bold text-[#006233]">
                      {fmtInt(b.price)} · {fmtInt(b.quantityQuintals)} q
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 h-fit">
            <div className="font-extrabold text-[#004624] mb-3">🙋 {t("auctions.placeBid")}</div>
            {loggedIn ? (
              <div className="space-y-3">
                <div>
                  <label className="label">{t("auctions.yourBid")}</label>
                  <input type="number" className="input tabular-nums" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t("auctions.qtyBid")}</label>
                  <input type="number" className="input tabular-nums" value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                <button onClick={bid} disabled={busy} className="btn-buy w-full">
                  {busy ? "…" : t("auctions.placeBid")}
                </button>
                {isState && (
                  <button onClick={settle} disabled={busy} className="btn-red w-full">
                    ⚖️ {t("auctions.settle")}
                  </button>
                )}
                {msg && <div className="text-[11px] font-bold text-slate-600 bg-slate-50 rounded-lg p-2">{msg}</div>}
              </div>
            ) : (
              <a href="/login" className="btn-outline w-full text-xs">🔒 {t("auctions.loginToBid")}</a>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center text-slate-400">{t("auctions.noLive")}</div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624]">
          🗂️ {t("auctions.pastResults")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">{t("common.code")}</th>
                <th className="th">{t("common.grade")}</th>
                <th className="th text-end">{t("common.quantity")}</th>
                <th className="th text-end">{t("auctions.settledAt")}</th>
                <th className="th">{t("auctions.seller")}</th>
                <th className="th">{t("common.winner")}</th>
                <th className="th">{t("common.date")}</th>
              </tr>
            </thead>
            <tbody>
              {past.map((a) => (
                <tr key={a.id} className="border-t border-slate-50">
                  <td className="td font-mono text-[11px]">{a.code}</td>
                  <td className="td"><GradeBadge grade={a.grade} label={a.grade} /></td>
                  <td className="td text-end tabular-nums">{fmtQty(a.quantityQuintals, lang)}</td>
                  <td className="td text-end font-black text-[#006233] tabular-nums">
                    {a.settlePrice != null ? fmtInt(a.settlePrice) : "—"}
                  </td>
                  <td className="td text-xs">{localName(a.sellerAr, a.sellerEn, lang)}</td>
                  <td className="td text-xs">{localName(a.winnerAr, a.winnerEn, lang)}</td>
                  <td className="td text-xs text-slate-400">{fmtDateTime(a.scheduledAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AuctionStatusChip({ open }: { open: boolean }) {
  const { t } = useI18n();
  return open ? <StatusPill status={`● ${t("common.live")}`} tone="red" /> : <StatusPill status={t("common.closed")} />;
}
