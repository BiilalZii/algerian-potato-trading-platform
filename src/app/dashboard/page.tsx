import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/shell";
import { GradeBadge, StatusPill, PageHead } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getCurrentUser } from "@/lib/auth";
import {
  getReceipts,
  getMyOrders,
  getUserTrades,
  getStores,
  getInterventions,
  getSettings,
} from "@/lib/queries";
import { localName, fmtDzd, fmtInt, fmtQty, fmtTons, gradeLabel, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
        <span>{icon}</span> {label}
      </div>
      <div className="text-2xl font-black text-[#004624] mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function ActionTile({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link href={href} className="card p-4 flex items-center gap-3 hover:ring-2 hover:ring-emerald-300 transition">
      <span className="h-11 w-11 rounded-xl bg-emerald-50 grid place-items-center text-xl">{icon}</span>
      <span>
        <span className="block font-extrabold text-sm text-[#004624]">{title}</span>
        <span className="block text-[11px] text-slate-400">{sub}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = lang === "ar" ? user.nameAr : user.nameEn;
  const hint = t(`dashboard.${user.role}Hint` as any);

  const [receipts, myOrders, myTrades, stores, interventions, settings] = await Promise.all([
    getReceipts({ holderId: user.id }),
    getMyOrders(user.id, 12),
    getUserTrades(user.id, 12),
    ["warehouse", "admin", "state"].includes(user.role) ? getStores() : Promise.resolve([]),
    ["state", "admin"].includes(user.role) ? getInterventions(8) : Promise.resolve([]),
    getSettings(),
  ]);

  const allReceipts =
    user.role === "bank" || user.role === "admin" ? await getReceipts() : receipts;
  const pledged =
    user.role === "bank"
      ? allReceipts.filter((r) => r.receipt.status === "pledged" && r.receipt.pledgedBankId === user.id)
      : allReceipts.filter((r) => r.receipt.status === "pledged");
  const financing = pledged.reduce((a, r) => a + Number(r.receipt.pledgeAmountDzd ?? 0), 0);

  const openOrders = myOrders.filter((o) => o.status === "open" || o.status === "partial");
  const myStores =
    user.role === "warehouse" ? stores.filter((s) => s.s.operatorId === user.id) : stores;
  const stockValue =
    user.role === "warehouse"
      ? myStores.reduce((a, s) => a + s.s.usedQuintals * 100 * 45, 0)
      : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHead icon="👤" title={`${t("dashboard.welcome")}، ${name}`} subtitle={hint} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Kpi icon="💳" label={t("dashboard.myWallet")} value={fmtDzd(Number(user.walletDzd), lang)} />
          <Kpi icon="🧾" label={t("dashboard.myReceipts")} value={String(receipts.length)} />
          <Kpi icon="📋" label={t("dashboard.openOrder")} value={String(openOrders.length)} sub={`${t("dashboard.myTrades")}: ${myTrades.length}`} />
          <Kpi
            icon={user.role === "bank" ? "🏦" : user.role === "state" ? "🏛️" : "📦"}
            label={user.role === "bank" ? t("dashboard.financingGranted") : user.role === "warehouse" ? t("dashboard.myStore") : t("dashboard.myTrades")}
            value={
              user.role === "bank"
                ? fmtDzd(financing, lang)
                : user.role === "warehouse"
                  ? fmtTons(myStores.reduce((a, s) => a + s.s.usedQuintals, 0), lang)
                  : String(myTrades.length)
            }
            sub={user.role === "warehouse" ? fmtDzd(stockValue, lang) : undefined}
          />
        </div>

        {/* quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {["farmer", "trader", "processor", "state", "admin"].includes(user.role) && (
            <ActionTile href="/trading" icon="📈" title={t("nav.trading")} sub={t("trading.subtitle")} />
          )}
          {["warehouse", "admin", "state"].includes(user.role) && (
            <ActionTile href="/receipts" icon="🧾" title={t("receipts.issue")} sub={t("receipts.subtitle")} />
          )}
          {["farmer", "trader", "processor", "bank", "admin"].includes(user.role) && (
            <ActionTile href="/receipts" icon="🏦" title={t("receipts.pledge")} sub={t("receipts.pledgeHint")} />
          )}
          <ActionTile href="/auctions" icon="🔨" title={t("nav.auctions")} sub={t("auctions.subtitle")} />
          {(user.role === "state" || user.role === "admin") && (
            <ActionTile href="/intervention" icon="🏛️" title={t("nav.intervention")} sub={t("intervention.bandTitle")} />
          )}
          <ActionTile href="/trace" icon="🔎" title={t("nav.trace")} sub={t("trace.subtitle")} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* receipts / pledges */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624] flex justify-between">
              <span>{user.role === "bank" ? t("dashboard.pledgesToReview") : t("dashboard.myReceipts")}</span>
              <Link href="/receipts" className="text-xs text-emerald-700 font-bold hover:underline">↗</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {(user.role === "bank" ? pledged : receipts).slice(0, 6).map((r: any) => (
                <div key={r.receipt.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <GradeBadge grade={r.receipt.grade} label={r.receipt.grade} />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-bold text-[#004624]">{r.receipt.code}</div>
                    <div className="text-slate-400 truncate">{localName(r.store.nameAr, r.store.nameEn, lang)} · {fmtInt(r.receipt.totalQuantityQuintals)} q</div>
                  </div>
                  <StatusPill
                    status={t(`common.${r.receipt.status}`)}
                    tone={r.receipt.status === "active" ? "green" : r.receipt.status === "pledged" ? "amber" : "blue"}
                  />
                  {r.receipt.pledgeAmountDzd != null && (
                    <span className="font-bold text-amber-700 tabular-nums">{fmtDzd(Number(r.receipt.pledgeAmountDzd), lang)}</span>
                  )}
                </div>
              ))}
              {(user.role === "bank" ? pledged : receipts).length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">{t("dashboard.noReceipts")}</div>
              )}
            </div>
          </div>

          {/* orders + trades */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624] flex justify-between">
              <span>{t("dashboard.myTrades")}</span>
              <Link href="/trading" className="text-xs text-emerald-700 font-bold hover:underline">↗</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {myTrades.slice(0, 7).map((tr) => {
                const iAmBuyer = tr.buyerId === user.id;
                return (
                  <div key={tr.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <GradeBadge grade={tr.grade} label={tr.grade} />
                    <span className={`badge ${iAmBuyer ? "bg-emerald-100 text-emerald-800 ring-emerald-300" : "bg-rose-100 text-rose-800 ring-rose-300"}`}>
                      {iAmBuyer ? `▲ ${t("common.buy")}` : `▼ ${t("common.sell")}`}
                    </span>
                    <span className="font-mono text-slate-400">{tr.ref}</span>
                    <span className="flex-1 text-end tabular-nums font-bold">
                      {fmtInt(tr.price)} · {fmtQty(tr.quantityQuintals, lang)}
                    </span>
                    <span className="text-slate-400 text-[10px]">{fmtDateTime(tr.createdAt, lang)}</span>
                  </div>
                );
              })}
              {myTrades.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">{t("dashboard.noTrades")}</div>
              )}
            </div>
            {openOrders.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
                {openOrders.length} {t("dashboard.openOrder")} ·{" "}
                {openOrders.map((o) => `${o.side === "buy" ? "▲" : "▼"}${o.filledQuintals}/${o.quantityQuintals}@${o.price ?? "mkt"}`).join("  ·  ")}
              </div>
            )}
          </div>
        </div>

        {/* state / warehouse panels */}
        {(user.role === "state" || user.role === "admin") && (
          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            {settings.map((s) => (
              <Link key={s.grade} href="/intervention" className="card p-5 hover:ring-2 hover:ring-emerald-300 transition">
                <div className="flex items-center justify-between">
                  <GradeBadge grade={s.grade} label={gradeLabel(s.grade, lang)} />
                  <StatusPill status={s.marketMakerEnabled ? t("intervention.mmOn") : t("intervention.mmOff")} tone={s.marketMakerEnabled ? "green" : "slate"} />
                </div>
                <div className="text-3xl font-black text-[#004624] mt-3 tabular-nums">{s.referencePrice} <span className="text-xs text-slate-400">{t("common.perKg")}</span></div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-emerald-700 font-bold">↧ {s.floorPrice}</span>
                  <span className="text-slate-400">{fmtTons(s.stateStockQuintals, lang)}</span>
                  <span className="text-rose-700 font-bold">{s.ceilingPrice} ↥</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {user.role === "warehouse" && (
          <div className="card overflow-hidden mt-4">
            <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624]">{t("dashboard.myStore")}</div>
            <div className="divide-y divide-slate-50">
              {myStores.map((r) => (
                <div key={r.s.id} className="px-4 py-3 flex items-center gap-4 text-sm">
                  <div className="flex-1">
                    <div className="font-bold text-[#004624]">{localName(r.s.nameAr, r.s.nameEn, lang)}</div>
                    <div className="text-[11px] text-slate-400">{localName(r.w.nameAr, r.w.nameEn, lang)} · {r.s.temperatureC}°C</div>
                  </div>
                  <div className="w-40">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.round((r.s.usedQuintals / r.s.capacityQuintals) * 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 tabular-nms tabular-nums">
                      {fmtInt(r.s.usedQuintals)} / {fmtInt(r.s.capacityQuintals)} q
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {interventions.length > 0 && (
          <div className="card overflow-hidden mt-4">
            <div className="px-4 py-3 border-b border-slate-100 font-extrabold text-sm text-[#004624]">{t("intervention.history")}</div>
            <div className="divide-y divide-slate-50">
              {interventions.map((r) => (
                <div key={r.i.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <span className={`badge ${r.i.type === "buy" ? "bg-emerald-100 text-emerald-800 ring-emerald-300" : r.i.type === "sell" ? "bg-rose-100 text-rose-800 ring-rose-300" : "bg-slate-100 text-slate-700 ring-slate-300"}`}>
                    {r.i.type === "buy" ? `🟢 ${t("common.buy")}` : r.i.type === "sell" ? `🔴 ${t("common.sell")}` : "↔ band"}
                  </span>
                  <GradeBadge grade={r.i.grade} label={r.i.grade} />
                  <span className="flex-1 text-slate-500 truncate">{localName(r.i.reasonAr, r.i.reasonEn, lang)}</span>
                  <span className="tabular-nums text-slate-400">{r.i.beforePrice} → <b className="text-[#004624]">{r.i.afterPrice}</b></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
