import { db } from "@/db";
import {
  users,
  wilayas,
  coldStores,
  receipts,
  potatoLots,
  lotEvents,
  orders,
  trades,
  auctions,
  auctionBids,
  interventions,
  marketSettings,
  priceHistory,
} from "@/db/schema";
import { and, desc, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PricePoint } from "@/components/charts";

type Grade = "A" | "B" | "C";

export async function getSettings() {
  return db.select().from(marketSettings).orderBy(marketSettings.grade);
}

export async function getTodayBars() {
  const day = new Date().toISOString().slice(0, 10);
  return db.select().from(priceHistory).where(eq(priceHistory.day, day));
}

export async function getSeries(grade: Grade, days = 120): Promise<PricePoint[]> {
  const settingsRows = await db
    .select()
    .from(marketSettings)
    .where(eq(marketSettings.grade, grade));
  const s = settingsRows[0];
  const rows = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.grade, grade))
    .orderBy(asc(priceHistory.day))
    .limit(days);
  return rows.map((r) => ({
    day: r.day,
    close: r.closePrice,
    volume: r.volumeQuintals,
    floor: s?.floorPrice ?? 0,
    ceiling: s?.ceilingPrice ?? 0,
    intervened: r.stateIntervened,
  }));
}

export interface BookLevel {
  price: number;
  qty: number;
  cum: number;
  state: boolean;
}

export async function getBook(grade: Grade) {
  const stateRows = await db.select().from(users).where(eq(users.role, "state")).limit(1);
  const stateId = stateRows[0]?.id ?? -1;
  const open = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.grade, grade),
        inArray(orders.status, ["open", "partial"]),
        sql`${orders.quantityQuintals} - ${orders.filledQuintals} > 0`,
      ),
    );

  const agg = (side: "buy" | "sell") => {
    const map = new Map<number, { qty: number; state: boolean }>();
    for (const o of open.filter((o) => o.side === side)) {
      const q = o.quantityQuintals - o.filledQuintals;
      const cur = map.get(o.price ?? 0) ?? { qty: 0, state: false };
      cur.qty += q;
      if (o.userId === stateId) cur.state = true;
      map.set(o.price ?? 0, cur);
    }
    const levels: BookLevel[] = [...map.entries()]
      .map(([price, v], _i, arr) => ({ price, qty: v.qty, cum: 0, state: v.state }))
      .sort((a, b) => (side === "buy" ? b.price - a.price : a.price - b.price));
    let cum = 0;
    for (const l of levels) {
      cum += l.qty;
      l.cum = cum;
    }
    return levels.slice(0, 11);
  };

  const bids = agg("buy");
  const asks = agg("sell");
  return { bids, asks, bestBid: bids[0]?.price, bestAsk: asks[0]?.price };
}

export async function getRecentTrades(grade: Grade | "ALL" = "ALL", limit = 18) {
  const buyerT = alias(users, "buyer_u");
  const sellerT = alias(users, "seller_u");
  const rows = await db
    .select({ trade: trades, buyer: buyerT, seller: sellerT })
    .from(trades)
    .innerJoin(buyerT, eq(buyerT.id, trades.buyerId))
    .innerJoin(sellerT, eq(sellerT.id, trades.sellerId))
    .where(grade === "ALL" ? undefined : eq(trades.grade, grade))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.trade, buyer: r.buyer, seller: r.seller }));
}

export async function getMyOrders(userId: number, limit = 30) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows;
}

export async function getAllOrders(limit = 40) {
  const rows = await db
    .select({ order: orders, user: users })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.order, user: r.user }));
}

export async function getActiveReceiptsForUser(userId: number) {
  const rows = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.holderId, userId), eq(receipts.status, "active")));
  return rows;
}

export async function getReceipts(filter?: { holderId?: number }) {
  const holderT = alias(users, "holder_u");
  const bankT = alias(users, "bank_u");
  const farmerT = alias(users, "farmer_u");
  const rs = await db
    .select({
      receipt: receipts,
      lot: potatoLots,
      store: coldStores,
      holder: holderT,
      bank: bankT,
      farmer: farmerT,
      wilaya: wilayas,
    })
    .from(receipts)
    .innerJoin(potatoLots, eq(potatoLots.id, receipts.lotId))
    .innerJoin(coldStores, eq(coldStores.id, receipts.coldStoreId))
    .innerJoin(holderT, eq(holderT.id, receipts.holderId))
    .leftJoin(bankT, eq(bankT.id, receipts.pledgedBankId))
    .innerJoin(farmerT, eq(farmerT.id, potatoLots.farmerId))
    .innerJoin(wilayas, eq(wilayas.id, coldStores.wilayaId))
    .orderBy(desc(receipts.createdAt));

  return rs.filter((row) => !filter?.holderId || row.holder.id === filter.holderId);
}

export async function getStores() {
  const rows = await db
    .select({ s: coldStores, w: wilayas, op: users })
    .from(coldStores)
    .innerJoin(wilayas, eq(wilayas.id, coldStores.wilayaId))
    .leftJoin(users, eq(users.id, coldStores.operatorId))
    .orderBy(desc(coldStores.capacityQuintals));
  return rows;
}

export async function getLiveAuction() {
  const rows = await db
    .select({ a: auctions, seller: users })
    .from(auctions)
    .leftJoin(users, eq(users.id, auctions.sellerId))
    .where(eq(auctions.status, "open"))
    .orderBy(asc(auctions.scheduledAt))
    .limit(1);
  if (!rows[0]) return null;
  const bids = await db
    .select({ b: auctionBids, u: users })
    .from(auctionBids)
    .innerJoin(users, eq(users.id, auctionBids.userId))
    .where(eq(auctionBids.auctionId, rows[0].a.id))
    .orderBy(desc(auctionBids.price));
  return { auction: rows[0].a, seller: rows[0].seller, bids: bids.map((x) => ({ ...x.b, user: x.u })) };
}

export async function getPastAuctions(limit = 10) {
  const sellerT = alias(users, "aseller_u");
  const winnerT = alias(users, "awinner_u");
  const rows = await db
    .select({ a: auctions, seller: sellerT, winner: winnerT })
    .from(auctions)
    .leftJoin(sellerT, eq(sellerT.id, auctions.sellerId))
    .leftJoin(winnerT, eq(winnerT.id, auctions.winnerId))
    .where(eq(auctions.status, "settled"))
    .orderBy(desc(auctions.scheduledAt))
    .limit(limit);
  return rows;
}

export async function getInterventions(limit = 24) {
  const rows = await db
    .select({ i: interventions, op: users })
    .from(interventions)
    .leftJoin(users, eq(users.id, interventions.operatorId))
    .orderBy(desc(interventions.createdAt))
    .limit(limit);
  return rows;
}

export async function getTrace(code: string) {
  const c = code.trim().toUpperCase();
  // by lot code
  let lot = (
    await db
      .select({ l: potatoLots, f: users, w: wilayas })
      .from(potatoLots)
      .innerJoin(users, eq(users.id, potatoLots.farmerId))
      .innerJoin(wilayas, eq(wilayas.id, potatoLots.wilayaId))
      .where(eq(potatoLots.code, c))
      .limit(1)
  )[0];

  let matchedReceipt: any = null;
  if (!lot && c.startsWith("EWR")) {
    const rr = await db
      .select()
      .from(receipts)
      .where(eq(receipts.code, c))
      .limit(1);
    matchedReceipt = rr[0];
    if (matchedReceipt) {
      lot = (
        await db
          .select({ l: potatoLots, f: users, w: wilayas })
          .from(potatoLots)
          .innerJoin(users, eq(users.id, potatoLots.farmerId))
          .innerJoin(wilayas, eq(wilayas.id, potatoLots.wilayaId))
          .where(eq(potatoLots.id, matchedReceipt.lotId))
          .limit(1)
      )[0];
    }
  }
  if (!lot) return null;
  const events = await db
    .select()
    .from(lotEvents)
    .where(eq(lotEvents.lotId, lot.l.id))
    .orderBy(asc(lotEvents.createdAt));
  const rcpts = await db
    .select({ r: receipts, s: coldStores, h: users })
    .from(receipts)
    .innerJoin(coldStores, eq(coldStores.id, receipts.coldStoreId))
    .innerJoin(users, eq(users.id, receipts.holderId))
    .where(eq(receipts.lotId, lot.l.id));
  return { lot: lot.l, farmer: lot.f, wilaya: lot.w, events, receipts: rcpts, queriedReceipt: matchedReceipt };
}

export async function getFarmers() {
  return db.select().from(users).where(eq(users.role, "farmer"));
}
export async function getBanks() {
  return db.select().from(users).where(eq(users.role, "bank"));
}
export async function getWarehouseUsers() {
  return db.select().from(users).where(eq(users.role, "warehouse"));
}

export async function getNetworkTotals() {
  const rows = await db
    .select({
      capacity: sql<string>`COALESCE(SUM(${coldStores.capacityQuintals}),0)`,
      used: sql<string>`COALESCE(SUM(${coldStores.usedQuintals}),0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(coldStores);
  return {
    capacity: Number(rows[0]?.capacity ?? 0),
    used: Number(rows[0]?.used ?? 0),
    count: Number(rows[0]?.count ?? 0),
  };
}

export async function getUserTrades(userId: number, limit = 20) {
  const rows = await db
    .select()
    .from(trades)
    .where(
      sql`(${trades.buyerId} = ${userId} OR ${trades.sellerId} = ${userId})`,
    )
    .orderBy(desc(trades.createdAt))
    .limit(limit);
  return rows;
}
