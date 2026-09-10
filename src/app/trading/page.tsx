import { cookies } from "next/headers";
import AppShell from "@/components/shell";
import { PageHead } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, getBook, getRecentTrades, getMyOrders, getActiveReceiptsForUser } from "@/lib/queries";
import { TradingFloor } from "@/components/trading";
import { localName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TradingPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const user = await getCurrentUser();

  const settingsRows = await getSettings();
  const settings = settingsRows.map((s) => ({
    grade: s.grade as "A" | "B" | "C",
    referencePrice: s.referencePrice,
    floorPrice: s.floorPrice,
    ceilingPrice: s.ceilingPrice,
    marketMakerEnabled: s.marketMakerEnabled,
    stateStockQuintals: s.stateStockQuintals,
  }));

  const books: Record<string, Awaited<ReturnType<typeof getBook>>> = {};
  const trades: Record<string, any[]> = {};
  for (const g of ["A", "B", "C"] as const) {
    books[g] = await getBook(g);
    const rows = await getRecentTrades(g, 22);
    trades[g] = rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      grade: r.grade,
      quantityQuintals: r.quantityQuintals,
      price: r.price,
      createdAt: r.createdAt.toISOString(),
      buyerNameAr: r.buyer.nameAr,
      buyerNameEn: r.buyer.nameEn,
      buyerRole: r.buyer.role,
      sellerNameAr: r.seller.nameAr,
      sellerNameEn: r.seller.nameEn,
      sellerRole: r.seller.role,
    }));
  }

  let myOrders: any[] = [];
  let myReceipts: any[] = [];
  if (user) {
    const os = await getMyOrders(user.id, 40);
    myOrders = os.map((o) => ({
      id: o.id,
      ref: o.ref,
      side: o.side,
      orderType: o.orderType,
      grade: o.grade,
      quantityQuintals: o.quantityQuintals,
      filledQuintals: o.filledQuintals,
      price: o.price,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));
    const rs = await getActiveReceiptsForUser(user.id);
    const storeIds = [...new Set(rs.map((r) => r.coldStoreId))];
    const { db } = await import("@/db");
    const { coldStores } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");
    const storeRows = storeIds.length
      ? await db.select().from(coldStores).where(inArray(coldStores.id, storeIds))
      : [];
    const smap = new Map(storeRows.map((s) => [s.id, s]));
    myReceipts = rs.map((r) => ({
      id: r.id,
      code: r.code,
      grade: r.grade,
      available: r.availableQuantityQuintals,
      storeAr: smap.get(r.coldStoreId)?.nameAr ?? "",
      storeEn: smap.get(r.coldStoreId)?.nameEn ?? "",
    }));
  }

  void localName;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHead icon="📈" title={t("trading.title")} subtitle={t("trading.subtitle")} />
        <TradingFloor
          settings={settings}
          books={books}
          trades={trades}
          myOrders={myOrders}
          myReceipts={myReceipts}
          loggedIn={!!user}
          walletDzd={user ? Number(user.walletDzd) : 0}
        />
      </div>
    </AppShell>
  );
}
