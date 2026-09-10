"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { GradeBadge, StatusPill } from "./site";
import { fmtInt, fmtDzd, fmtQty, fmtTons, gradeLabel, localName, fmtDate } from "@/lib/format";

export interface ReceiptDto {
  id: number;
  code: string;
  grade: "A" | "B" | "C";
  total: number;
  available: number;
  status: string;
  pledgeAmount: number | null;
  issueDate: string;
  lotCode: string;
  variety: string;
  quality: number;
  storeAr: string;
  storeEn: string;
  holderId: number;
  holderAr: string;
  holderEn: string;
  holderRole: string;
  bankAr: string | null;
  bankEn: string | null;
  farmerAr: string;
  farmerEn: string;
  wilayaAr: string;
  wilayaEn: string;
}

export interface OptionDto {
  id: number;
  labelAr: string;
  labelEn: string;
  wilayaAr?: string;
  wilayaEn?: string;
  capacity?: number;
  used?: number;
}

function Qr({ text, size = 96 }: { text: string; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: "#004624", light: "#ffffff" } })
      .then(setUrl)
      .catch(() => setUrl(""));
  }, [text, size]);
  if (!url) return <div style={{ width: size, height: size }} className="bg-slate-100 rounded" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} width={size} height={size} alt="QR" className="rounded bg-white p-1" />;
}

function ReceiptCard({
  r,
  user,
  banks,
}: {
  r: ReceiptDto;
  user: { id: number; role: string } | null;
  banks: OptionDto[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [sellPrice, setSellPrice] = useState("");
  const [showSell, setShowSell] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [bankId, setBankId] = useState(String(banks[0]?.id ?? ""));

  const isHolder = user?.id === r.holderId;
  const canPledge = !!user && (user.role === "bank" || user.role === "admin") && r.status === "active";
  const canRelease =
    !!user && ["bank", "admin"].includes(user.role) && r.status === "pledged";
  const canSell = isHolder && r.status === "active";

  async function act(body: any, okText: string) {
    setBusy(true);
    const endpoint = body.action === "sell-order" ? "/api/trade" : "/api/receipt";
    const payload =
      body.action === "sell-order"
        ? { action: "place", side: "sell", grade: body.grade, price: body.price, qty: body.qty, receiptId: body.receiptId }
        : body;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    setBusy(false);
    setMsg(j.ok ? okText : j.error);
    if (j.ok) {
      setShowSell(false);
      router.refresh();
    }
  }

  const statusTone = r.status === "active" ? "green" : r.status === "pledged" ? "amber" : r.status === "transferred" ? "blue" : "slate";

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
        <div>
          <div className="font-mono text-sm font-black text-[#004624]">{r.code}</div>
          <div className="text-[11px] text-slate-400">
            {r.lotCode} · {r.variety} · {t("receipts.farmer")}: {localName(r.farmerAr, r.farmerEn, lang)}
          </div>
        </div>
        <StatusPill status={t(`common.${r.status}`)} tone={statusTone as any} />
      </div>
      <div className="p-4 flex gap-4 items-center">
        <Qr text={`${typeof window !== "undefined" ? window.location.origin : ""}/trace?code=${r.lotCode}`} />
        <div className="flex-1 space-y-1.5 text-xs">
          <div className="flex items-center gap-2"><GradeBadge grade={r.grade} label={gradeLabel(r.grade, lang)} /></div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t("common.quantity")}</span>
            <span className="font-bold tabular-nums">{fmtInt(r.total)} q · {fmtTons(r.total, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t("receipts.available")}</span>
            <span className="font-bold tabular-nums">{fmtInt(r.available)} q</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t("receipts.qualityScore")}</span>
            <span className="font-bold tabular-nums">{r.quality}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t("receipts.store")}</span>
            <span className="font-bold text-end">{localName(r.storeAr, r.storeEn, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t("common.wilaya")}</span>
            <span className="font-bold">{localName(r.wilayaAr, r.wilayaEn, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t("common.holder")}</span>
            <span className="font-bold">{localName(r.holderAr, r.holderEn, lang)}</span>
          </div>
          {r.status === "pledged" && (
            <div className="flex justify-between rounded-lg bg-amber-50 px-2 py-1">
              <span className="text-amber-700">{localName(r.bankAr, r.bankEn, lang)}</span>
              <span className="font-black text-amber-800 tabular-nums">{fmtDzd(r.pledgeAmount, lang)}</span>
            </div>
          )}
          <div className="text-[10px] text-slate-400">{fmtDate(r.issueDate, lang)}</div>
        </div>
      </div>
      <div className="mt-auto p-3 pt-0 flex flex-wrap gap-2">
        <Link href={`/trace?code=${r.lotCode}`} className="btn-ghost px-3 py-1.5 text-[11px]">
          🔍 {t("receipts.trace")}
        </Link>
        {canPledge && (
          <>
            {user?.role === "admin" && (
              <select className="input !py-1.5 text-xs w-auto" value={bankId} onChange={(e) => setBankId(e.target.value)}>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{localName(b.labelAr, b.labelEn, lang)}</option>
                ))}
              </select>
            )}
            <button
              disabled={busy}
              onClick={() => act({ action: "pledge", receiptId: r.id, bankId: Number(bankId) }, t("receipts.pledged"))}
              className="btn-outline px-3 py-1.5 text-[11px]"
            >
              🏦 {t("receipts.pledge")} (70%)
            </button>
          </>
        )}
        {canRelease && (
          <button
            disabled={busy}
            onClick={() => act({ action: "release", receiptId: r.id }, t("receipts.release"))}
            className="btn-ghost px-3 py-1.5 text-[11px]"
          >
            🔓 {t("receipts.release")}
          </button>
        )}
        {canSell && (
          <button onClick={() => setShowSell((v) => !v)} className="btn-sell px-3 py-1.5 text-[11px]">
            📈 {t("receipts.sellOnExchange")}
          </button>
        )}
      </div>
      {canSell && showSell && (
        <div className="px-4 pb-4 flex items-center gap-2">
          <input
            type="number"
            className="input !py-1.5 text-xs tabular-nums"
            placeholder={t("receipts.sellPrice")}
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
          />
          <button
            disabled={busy || !sellPrice}
            onClick={() =>
              act(
                { action: "sell-order", grade: r.grade, price: Number(sellPrice), qty: r.available, receiptId: r.id },
                t("trading.orderPlaced"),
              )
            }
            className="btn-sell px-3 py-1.5 text-[11px] whitespace-nowrap"
          >
            {t("common.confirm")} · {fmtQty(r.available, lang)}
          </button>
        </div>
      )}
      {msg && <div className="mx-4 mb-3 text-[11px] font-bold rounded-lg bg-slate-50 p-2 text-slate-600">{msg}</div>}
    </div>
  );
}

export function IssueForm({
  farmers,
  stores,
  defaultStoreId,
}: {
  farmers: OptionDto[];
  stores: OptionDto[];
  defaultStoreId?: number;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState({
    farmerId: String(farmers[0]?.id ?? ""),
    coldStoreId: String(defaultStoreId ?? stores[0]?.id ?? ""),
    grade: "B",
    variety: "Spunta",
    qty: "100",
    quality: "85",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue", ...body, farmerId: Number(body.farmerId), coldStoreIdReal: Number(body.coldStoreId), qty: Number(body.qty), quality: Number(body.quality) }),
    });
    const j = await res.json();
    setBusy(false);
    if (j.ok) {
      setMsg(`${t("receipts.issued")} · ${j.code}`);
      setOpen(false);
      router.refresh();
    } else setMsg(j.error);
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        ➕ {t("receipts.issue")}
      </button>
    );

  return (
    <div className="card p-5 w-full">
      <div className="font-extrabold text-[#004624] mb-4">🧾 {t("receipts.newReceiptTitle")}</div>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">{t("receipts.selectFarmer")}</label>
          <select className="input" value={body.farmerId} onChange={(e) => setBody({ ...body, farmerId: e.target.value })}>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{localName(f.labelAr, f.labelEn, lang)} — {localName(f.wilayaAr, f.wilayaEn, lang)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("receipts.selectStore")}</label>
          <select className="input" value={body.coldStoreId} onChange={(e) => setBody({ ...body, coldStoreId: e.target.value })}>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {localName(s.labelAr, s.labelEn, lang)} — {localName(s.wilayaAr, s.wilayaEn, lang)}
                {s.capacity ? ` (${fmtInt(s.used ?? 0)}/${fmtInt(s.capacity)} q)` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("receipts.selectVariety")}</label>
          <select className="input" value={body.variety} onChange={(e) => setBody({ ...body, variety: e.target.value })}>
            {["Spunta", "Agria", "Bartina", "Safran", "Alaska"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t("common.grade")}</label>
          <select className="input" value={body.grade} onChange={(e) => setBody({ ...body, grade: e.target.value })}>
            <option value="A">{gradeLabel("A", lang)}</option>
            <option value="B">{gradeLabel("B", lang)}</option>
            <option value="C">{gradeLabel("C", lang)}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("common.quantityQ")}</label>
          <input type="number" className="input tabular-nums" value={body.qty} onChange={(e) => setBody({ ...body, qty: e.target.value })} />
        </div>
        <div>
          <label className="label">{t("receipts.qualityScore")}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={40} max={100} className="flex-1 accent-emerald-700" value={body.quality}
              onChange={(e) => setBody({ ...body, quality: e.target.value })} />
            <span className="font-black text-[#006233] tabular-nums w-12 text-end">{body.quality}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "…" : t("receipts.submit")}</button>
        <button onClick={() => setOpen(false)} className="btn-ghost">{t("common.cancel")}</button>
      </div>
      {msg && <div className="mt-3 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg p-2">{msg}</div>}
    </div>
  );
}

export function ReceiptsView(props: {
  receipts: ReceiptDto[];
  farmers: OptionDto[];
  stores: OptionDto[];
  banks: OptionDto[];
  user: { id: number; role: string } | null;
}) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<"mine" | "all">(
    props.user && ["farmer", "trader", "processor"].includes(props.user.role) ? "mine" : "all",
  );
  const [grade, setGrade] = useState<"ALL" | "A" | "B" | "C">("ALL");

  const mineStoreId = useMemo(() => {
    if (props.user?.role !== "warehouse") return undefined;
    const s = props.stores.find((x) => x.labelEn.includes(""));
    void s;
    return undefined;
  }, [props.stores, props.user]);

  const visible = props.receipts.filter((r) => {
    if (filter === "mine" && props.user && r.holderId !== props.user.id) return false;
    if (grade !== "ALL" && r.grade !== grade) return false;
    return true;
  });

  const canIssue = !!props.user && ["warehouse", "admin", "state"].includes(props.user.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("mine")}
            className={`btn px-3 py-2 text-xs ${filter === "mine" ? "bg-[#006233] text-white" : "bg-white ring-1 ring-slate-200 text-slate-600"}`}
          >
            {t("receipts.myReceipts")}
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`btn px-3 py-2 text-xs ${filter === "all" ? "bg-[#006233] text-white" : "bg-white ring-1 ring-slate-200 text-slate-600"}`}
          >
            {t("receipts.allReceipts")}
          </button>
          <span className="w-px bg-slate-200 mx-1" />
          {(["ALL", "A", "B", "C"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`btn px-3 py-2 text-xs ${grade === g ? "bg-emerald-700 text-white" : "bg-white ring-1 ring-slate-200 text-slate-600"}`}
            >
              {g === "ALL" ? t("common.all") : g}
            </button>
          ))}
        </div>
        {canIssue ? (
          <IssueForm farmers={props.farmers} stores={props.stores} defaultStoreId={mineStoreId} />
        ) : (
          !props.user && (
            <a href="/login" className="btn-outline text-xs">🔒 {t("receipts.onlyWarehouse")}</a>
          )
        )}
      </div>

      {!canIssue && props.user && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-xs font-bold p-3">
          ℹ️ {t("receipts.onlyWarehouse")}
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((r) => (
          <ReceiptCard key={r.id} r={r} user={props.user} banks={props.banks} />
        ))}
        {visible.length === 0 && (
          <div className="card p-10 text-center text-slate-400 col-span-full">{t("common.noData")}</div>
        )}
      </div>
    </div>
  );
}
