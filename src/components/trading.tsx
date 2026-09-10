"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { GradeBadge, StatusPill } from "./site";
import { fmtInt, fmtDzd, fmtQty, gradeLabel, localName, timeAgo } from "@/lib/format";

export interface BookLevelDto {
  price: number;
  qty: number;
  cum: number;
  state: boolean;
}
export interface TradeDto {
  id: number;
  ref: string;
  grade: "A" | "B" | "C";
  quantityQuintals: number;
  price: number;
  createdAt: string;
  buyerNameAr: string;
  buyerNameEn: string;
  sellerNameAr: string;
  sellerNameEn: string;
  buyerRole: string;
  sellerRole: string;
}
export interface OrderDto {
  id: number;
  ref: string;
  side: "buy" | "sell";
  orderType: string;
  grade: "A" | "B" | "C";
  quantityQuintals: number;
  filledQuintals: number;
  price: number | null;
  status: string;
  createdAt: string;
}
export interface ReceiptOption {
  id: number;
  code: string;
  grade: "A" | "B" | "C";
  available: number;
  storeAr: string;
  storeEn: string;
}
export interface SettingDto2 {
  grade: "A" | "B" | "C";
  referencePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  marketMakerEnabled: boolean;
  stateStockQuintals: number;
}

async function post(body: any) {
  const r = await fetch("/api/trade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

function OrderBook({
  bids,
  asks,
  side,
}: {
  bids: BookLevelDto[];
  asks: BookLevelDto[];
  side: "buy" | "sell";
}) {
  const { t, lang } = useI18n();
  const maxCum = Math.max(
    bids[bids.length - 1]?.cum ?? 1,
    asks[asks.length - 1]?.cum ?? 1,
    1,
  );
  const asksView = [...asks].slice(0, 9).reverse();
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;

  const Row = ({ l, kind }: { l: BookLevelDto; kind: "bid" | "ask" }) => (
    <div className="relative grid grid-cols-3 text-xs tabular-nums px-2 py-1">
      <div
        className={`absolute inset-y-0 ${kind === "bid" ? "depth-bar-bid start-0" : "depth-bar-ask end-0"}`}
        style={{ width: `${Math.min(100, (l.cum / maxCum) * 100)}%` }}
      />
      <div className={`relative font-bold ${kind === "bid" ? "text-emerald-700" : "text-rose-700"}`}>
        {fmtInt(l.price)}
        {l.state && <span title={t("trading.stateOrder")}> 🏛️</span>}
      </div>
      <div className="relative text-center">{fmtInt(l.qty)}</div>
      <div className="relative text-end text-slate-400">{fmtInt(l.cum)}</div>
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="font-extrabold text-sm text-[#004624]">
          {side === "buy" ? "📕" : "📗"} {t("common.orderBook")}
        </div>
        <div className="text-[10px] text-slate-400">{t("trading.depthTitle")}</div>
      </div>
      <div className="grid grid-cols-3 text-[10px] font-bold text-slate-400 px-2 py-1.5 border-b border-slate-100">
        <span>{t("trading.priceLevel")}</span>
        <span className="text-center">{t("common.quantity")}</span>
        <span className="text-end">{t("common.depth")}</span>
      </div>
      <div className="py-1">
        {asksView.map((l) => (
          <Row key={`a${l.price}`} l={l} kind="ask" />
        ))}
      </div>
      <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold border-y border-slate-100">
        <span className="text-emerald-700">{t("trading.bestBid")}: {bestBid != null ? fmtInt(bestBid) : "—"}</span>
        <span className="text-slate-500">{t("common.spread")}: {spread != null ? fmtInt(spread) : "—"}</span>
        <span className="text-rose-700">{t("trading.bestAsk")}: {bestAsk != null ? fmtInt(bestAsk) : "—"}</span>
      </div>
      <div className="py-1">
        {bids.slice(0, 9).map((l) => (
          <Row key={`b${l.price}`} l={l} kind="bid" />
        ))}
      </div>
      <div className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        🏛️ {t("trading.stateLiquidity")} · {lang === "ar" ? "الكمية بالقناطر" : "quantities in quintals"}
      </div>
    </div>
  );
}

function TradesTape({ trades }: { trades: TradeDto[] }) {
  const { t, lang } = useI18n();
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624]">
        ⚡ {t("common.recentTrades")}
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-100">
          <span className="col-span-2">{t("common.grade")}</span>
          <span className="col-span-2 text-center">{t("common.price")}</span>
          <span className="col-span-2 text-center">{t("common.quantity")}</span>
          <span className="col-span-4">{lang === "ar" ? "المشتري ← البائع" : "Buyer ← seller"}</span>
          <span className="col-span-2 text-end">{t("common.date")}</span>
        </div>
        {trades.map((tr) => (
          <div key={tr.id} className="grid grid-cols-12 items-center text-xs px-3 py-1.5 border-b border-slate-50 hover:bg-slate-50">
            <span className="col-span-2"><GradeBadge grade={tr.grade} label={tr.grade} /></span>
            <span className="col-span-2 text-center font-bold tabular-nums">{fmtInt(tr.price)}</span>
            <span className="col-span-2 text-center tabular-nums">{fmtInt(tr.quantityQuintals)}</span>
            <span className="col-span-4 text-[11px] text-slate-500 truncate">
              {localName(tr.buyerNameAr, tr.buyerNameEn, lang)}
              {(tr.buyerRole === "state" || tr.sellerRole === "state") && " 🏛️"}
              {" ← "}
              {localName(tr.sellerNameAr, tr.sellerNameEn, lang)}
            </span>
            <span className="col-span-2 text-end text-[10px] text-slate-400">{timeAgo(tr.createdAt, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TradingFloor(props: {
  settings: SettingDto2[];
  books: Record<string, { bids: BookLevelDto[]; asks: BookLevelDto[] }>;
  trades: Record<string, TradeDto[]>;
  myOrders: OrderDto[];
  myReceipts: ReceiptOption[];
  loggedIn: boolean;
  walletDzd: number;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState<string>("");
  const [qty, setQty] = useState<string>("50");
  const [receiptId, setReceiptId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const s = props.settings.find((x) => x.grade === grade)!;
  const book = props.books[grade];

  useEffect(() => {
    const lvl = side === "buy" ? props.books[grade].bids[0]?.price : props.books[grade].asks[0]?.price;
    setPrice(String(lvl ?? s.referencePrice));
  }, [grade, side]); // eslint-disable-line react-hooks/exhaustive-deps

  const gradeReceipts = useMemo(
    () => props.myReceipts.filter((r) => r.grade === grade),
    [props.myReceipts, grade],
  );

  const doTick = useCallback(async () => {
    await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tick" }),
    });
    router.refresh();
  }, [router]);

  useEffect(() => {
    const h = setInterval(doTick, 8000);
    return () => clearInterval(h);
  }, [doTick]);

  const totalValue = (Number(qty) || 0) * 100 * (Number(price) || 0);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const res = await post({
      action: "place",
      side,
      grade,
      qty: Number(qty),
      price: Number(price),
      receiptId: side === "sell" && receiptId ? Number(receiptId) : null,
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: `${t("trading.orderPlaced")} · ${res.ref}` });
      router.refresh();
    } else {
      setMsg({ ok: false, text: `${t("trading.orderFailed")}: ${res.error}` });
    }
  }

  async function cancel(id: number) {
    await post({ action: "cancel", id });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* grade tabs + ticker strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(["A", "B", "C"] as const).map((g) => {
            const gs = props.settings.find((x) => x.grade === g)!;
            const active = g === grade;
            return (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold ring-1 transition ${
                  active ? "bg-[#006233] text-white ring-[#006233]" : "bg-white text-slate-600 ring-slate-200 hover:ring-emerald-300"
                }`}
              >
                {gradeLabel(g, lang)}
                <span className="block text-[10px] opacity-80 mt-0.5 tabular-nums">
                  {fmtInt(gs.referencePrice)} {t("common.perKg")}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 ms-auto">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-red-500" />
            {t("common.live")}
          </span>
          <button onClick={doTick} className="btn-outline px-3 py-2 text-xs">
            ⏯ {t("trading.marketTick")}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* order form */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-2">
              <button
                onClick={() => setSide("buy")}
                className={`py-3 text-sm font-black transition ${side === "buy" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-500"}`}
              >
                🟢 {t("trading.buy")}
              </button>
              <button
                onClick={() => setSide("sell")}
                className={`py-3 text-sm font-black transition ${side === "sell" ? "bg-rose-600 text-white" : "bg-slate-50 text-slate-500"}`}
              >
                🔴 {t("trading.sell")}
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-500">
                {side === "buy" ? t("trading.buyDesc") : t("trading.sellDesc")}
              </div>
              {side === "sell" && (
                <div>
                  <label className="label">{t("trading.againstReceipt")}</label>
                  <select className="input" value={receiptId} onChange={(e) => setReceiptId(e.target.value)}>
                    <option value="">{t("trading.noReceipt")}</option>
                    {gradeReceipts.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} — {r.available} q — {localName(r.storeAr, r.storeEn, lang)}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-slate-400 mt-1">{t("trading.sellReceiptHint")}</div>
                </div>
              )}
              <div>
                <label className="label">{t("common.priceKg")}</label>
                <input
                  type="number"
                  className="input tabular-nums"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={side === "buy" ? t("trading.pricePlaceholder") : t("trading.pricePlaceholderSell")}
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
                  <span>↧ {t("landing.floor")}: {s.floorPrice}</span>
                  <span>{t("landing.ceiling")}: {s.ceilingPrice} ↥</span>
                </div>
              </div>
              <div>
                <label className="label">{t("common.quantityQ")}</label>
                <input
                  type="number"
                  min={1}
                  className="input tabular-nums"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={t("trading.qtyPlaceholder")}
                />
                <div className="flex gap-1 mt-1.5">
                  {[10, 50, 100, 500].map((q) => (
                    <button key={q} onClick={() => setQty(String(q))} className="flex-1 rounded-md bg-slate-100 text-[10px] font-bold py-1 hover:bg-slate-200">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="text-[10px] font-bold text-slate-400">{t("common.totalValue")}</div>
                <div className={`font-black text-lg tabular-nums ${side === "buy" ? "text-emerald-700" : "text-rose-700"}`}>
                  {fmtDzd(totalValue, lang)}
                </div>
                {side === "buy" && props.loggedIn && (
                  <div className="text-[10px] text-slate-400">
                    {t("dashboard.myWallet")}: {fmtDzd(props.walletDzd, lang)}
                  </div>
                )}
              </div>
              {props.loggedIn ? (
                <button
                  onClick={submit}
                  disabled={busy}
                  className={side === "buy" ? "btn-buy w-full" : "btn-sell w-full"}
                >
                  {busy ? "…" : side === "buy" ? t("trading.submitBuy") : t("trading.submitSell")}
                </button>
              ) : (
                <a href="/login" className="btn-outline w-full text-xs">
                  🔒 {t("trading.connectToTrade")}
                </a>
              )}
              {msg && (
                <div className={`text-[11px] font-bold rounded-lg p-2 ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>

          {/* MM band card */}
          <div className="card p-4 text-xs">
            <div className="font-extrabold text-[#004624] mb-2">🏛️ {t("trading.stateLiquidity")}</div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{t("landing.floor")}</span>
              <span className="font-bold text-emerald-700 tabular-nums">{s.floorPrice} {t("common.perKg")}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{t("landing.ceiling")}</span>
              <span className="font-bold text-rose-700 tabular-nums">{s.ceilingPrice} {t("common.perKg")}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">{t("landing.stateStock")}</span>
              <span className="font-bold tabular-nums">{fmtQty(s.stateStockQuintals, lang)}</span>
            </div>
          </div>
        </div>

        {/* book */}
        <div className="lg:col-span-5">
          <OrderBook bids={book.bids} asks={book.asks} side={side} />
        </div>

        {/* trades */}
        <div className="lg:col-span-4">
          <TradesTape trades={props.trades[grade]} />
        </div>
      </div>

      {/* my orders */}
      {props.loggedIn && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624]">
            📋 {t("trading.myOrders")}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">{t("common.code")}</th>
                  <th className="th">{t("common.buy")}/{t("common.sell")}</th>
                  <th className="th">{t("common.grade")}</th>
                  <th className="th text-end">{t("common.price")}</th>
                  <th className="th text-end">{t("common.quantity")}</th>
                  <th className="th text-end">{t("common.status")}</th>
                  <th className="th text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {props.myOrders.length === 0 && (
                  <tr><td colSpan={7} className="td text-center text-slate-400 py-6">{t("dashboard.noOrders")}</td></tr>
                )}
                {props.myOrders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-50">
                    <td className="td font-mono text-[11px]">{o.ref}</td>
                    <td className="td">
                      <span className={`badge ${o.side === "buy" ? "bg-emerald-100 text-emerald-800 ring-emerald-300" : "bg-rose-100 text-rose-800 ring-rose-300"}`}>
                        {o.side === "buy" ? `▲ ${t("common.buy")}` : `▼ ${t("common.sell")}`}
                      </span>
                      {o.orderType === "state" && <span className="ms-1">🏛️</span>}
                    </td>
                    <td className="td"><GradeBadge grade={o.grade} label={o.grade} /></td>
                    <td className="td text-end tabular-nums">{o.price != null ? fmtInt(o.price) : "—"}</td>
                    <td className="td text-end tabular-nums">
                      {fmtInt(o.filledQuintals)}/{fmtInt(o.quantityQuintals)}
                    </td>
                    <td className="td text-end">
                      <StatusPill
                        status={t(`common.${o.status}`)}
                        tone={o.status === "open" ? "blue" : o.status === "partial" ? "amber" : o.status === "filled" ? "green" : "slate"}
                      />
                    </td>
                    <td className="td text-end">
                      {(o.status === "open" || o.status === "partial") && o.orderType !== "state" && (
                        <button onClick={() => cancel(o.id)} className="text-[11px] font-bold text-rose-600 hover:underline">
                          {t("trading.cancel")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
