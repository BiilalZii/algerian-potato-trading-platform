import { db } from "@/db";
import {
  users,
  orders,
  trades,
  receipts,
  potatoLots,
  lotEvents,
  coldStores,
  marketSettings,
  priceHistory,
  auctions,
  auctionBids,
  interventions,
} from "@/db/schema";

type Grade = "A" | "B" | "C";
type Order = typeof orders.$inferSelect;
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

/* ----------------------------- small helpers ----------------------------- */

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function genRef(prefix: string, len = 6) {
  const n = Math.floor(Math.random() * 10 ** len)
    .toString()
    .padStart(len, "0");
  return `${prefix}-${n}`;
}

export async function getStateUser() {
  const rows = await db.select().from(users).where(eq(users.role, "state")).limit(1);
  if (!rows[0]) throw new Error("State operator user not seeded");
  return rows[0];
}

const remaining = (o: Order) => o.quantityQuintals - o.filledQuintals;

/* --------------------------- market maker orders -------------------------- */

export async function ensureMarketMakers() {
  const settings = await db.select().from(marketSettings);
  const state = await getStateUser();

  for (const s of settings) {
    const stateOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, state.id),
          eq(orders.orderType, "state"),
          eq(orders.grade, s.grade),
          inArray(orders.status, ["open", "partial"]),
        ),
      );

    for (const o of stateOrders) {
      const stale =
        !s.marketMakerEnabled ||
        (o.side === "buy" && o.price !== s.floorPrice) ||
        (o.side === "sell" && o.price !== s.ceilingPrice);
      if (stale) {
        await db
          .update(orders)
          .set({ status: "cancelled" })
          .where(eq(orders.id, o.id));
      }
    }

    if (!s.marketMakerEnabled) continue;

    const hasBuy = stateOrders.some(
      (o) => o.side === "buy" && o.price === s.floorPrice && (o.status === "open" || o.status === "partial"),
    );
    const hasSell = stateOrders.some(
      (o) => o.side === "sell" && o.price === s.ceilingPrice && (o.status === "open" || o.status === "partial"),
    );

    if (!hasBuy) {
      await db.insert(orders).values({
        ref: genRef("ORD"),
        userId: state.id,
        side: "buy",
        orderType: "state",
        grade: s.grade,
        quantityQuintals: 500000,
        price: s.floorPrice,
        status: "open",
      });
    }
    if (!hasSell && s.stateStockQuintals > 0) {
      await db.insert(orders).values({
        ref: genRef("ORD"),
        userId: state.id,
        side: "sell",
        orderType: "state",
        grade: s.grade,
        quantityQuintals: s.stateStockQuintals,
        price: s.ceilingPrice,
        status: "open",
      });
    }
  }
}

/* ----------------------------- price bar (OHLC) ---------------------------- */

async function recordBar(grade: Grade, price: number, qty: number, intervened: boolean) {
  const day = todayStr();
  const existing = await db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.day, day), eq(priceHistory.grade, grade)))
    .limit(1);

  if (existing[0]) {
    const b = existing[0];
    await db
      .update(priceHistory)
      .set({
        closePrice: price,
        highPrice: Math.max(b.highPrice, price),
        lowPrice: Math.min(b.lowPrice, price),
        volumeQuintals: b.volumeQuintals + qty,
        stateIntervened: b.stateIntervened || intervened,
      })
      .where(eq(priceHistory.id, b.id));
  } else {
    await db.insert(priceHistory).values({
      day,
      grade,
      openPrice: price,
      highPrice: price,
      lowPrice: price,
      closePrice: price,
      volumeQuintals: qty,
      stateIntervened: intervened,
    });
  }
  await db
    .update(marketSettings)
    .set({ referencePrice: price })
    .where(eq(marketSettings.grade, grade));
}

/* ------------------------------ trade execution ---------------------------- */

async function executeTrade(buy: Order, sell: Order, qty: number) {
  const price = sell.price ?? buy.price ?? 0;
  if (!price) return;
  const value = qty * 100 * price;
  const state = await getStateUser();

  await db.transaction(async (tx) => {
    // update both orders
    for (const o of [buy, sell]) {
      const filled = o.filledQuintals + qty;
      await tx
        .update(orders)
        .set({
          filledQuintals: filled,
          status: filled >= o.quantityQuintals ? "filled" : "partial",
        })
        .where(eq(orders.id, o.id));
    }

    // wallets
    await tx
      .update(users)
      .set({ walletDzd: sql`${users.walletDzd} - ${value}` })
      .where(eq(users.id, buy.userId));
    await tx
      .update(users)
      .set({ walletDzd: sql`${users.walletDzd} + ${value}` })
      .where(eq(users.id, sell.userId));

    let receiptId: number | null = sell.receiptId ?? null;

    // receipt-backed settlement
    if (sell.receiptId) {
      const rcpts = await tx.select().from(receipts).where(eq(receipts.id, sell.receiptId)).limit(1);
      const r = rcpts[0];
      if (r) {
        const avail = r.availableQuantityQuintals - qty;
        await tx
          .update(receipts)
          .set({
            availableQuantityQuintals: avail,
            holderId: buy.userId,
            status: avail <= 0 ? "transferred" : r.status === "pledged" ? "pledged" : "active",
          })
          .where(eq(receipts.id, r.id));
        // free cold store space when fully delivered
        if (avail <= 0) {
          await tx
            .update(coldStores)
            .set({ usedQuintals: sql`GREATEST(${coldStores.usedQuintals} - ${r.totalQuantityQuintals}, 0)` })
            .where(eq(coldStores.id, r.coldStoreId));
          await tx.insert(lotEvents).values({
            lotId: r.lotId,
            type: "delivery",
            labelAr: "تسليم نهائي وتفريغ المستودع",
            labelEn: "Final delivery and warehouse release",
          });
        }
      }
    }

    // strategic stock impact
    const settingRows = await tx
      .select()
      .from(marketSettings)
      .where(eq(marketSettings.grade, sell.grade))
      .limit(1);
    const setting = settingRows[0];
    if (setting) {
      let stock = setting.stateStockQuintals;
      if (sell.userId === state.id) {
        stock = Math.max(0, stock - qty);
      } else if (buy.userId === state.id) {
        stock += qty;
      }
      if (stock !== setting.stateStockQuintals) {
        await tx
          .update(marketSettings)
          .set({ stateStockQuintals: stock })
          .where(eq(marketSettings.id, setting.id));
      }
    }

    await tx.insert(trades).values({
      ref: genRef("TRD"),
      buyOrderId: buy.id,
      sellOrderId: sell.id,
      buyerId: buy.userId,
      sellerId: sell.userId,
      grade: sell.grade,
      quantityQuintals: qty,
      price,
      receiptId,
      auctionId: buy.auctionId ?? sell.auctionId ?? null,
      status: "settled",
    });
  });

  const stateInvolved = buy.userId === state.id || sell.userId === state.id;
  await recordBar(sell.grade, price, qty, stateInvolved);
}

/* ------------------------------- matching --------------------------------- */

export async function matchGrade(grade: Grade) {
  let iterations = 0;
  while (iterations < 50) {
    iterations++;
    const buys = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.grade, grade),
          eq(orders.side, "buy"),
          inArray(orders.status, ["open", "partial"]),
        ),
      )
      .orderBy(desc(orders.price), asc(orders.createdAt));

    const sells = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.grade, grade),
          eq(orders.side, "sell"),
          inArray(orders.status, ["open", "partial"]),
        ),
      )
      .orderBy(asc(orders.price), asc(orders.createdAt));

    let crossed = false;
    outer: for (const buy of buys) {
      const buyer = await db.select().from(users).where(eq(users.id, buy.userId)).limit(1);
      for (const sell of sells) {
        if (buy.userId === sell.userId) continue;
        if (buy.price == null || sell.price == null) continue;
        if (buy.price < sell.price) continue;
        const qty = Math.min(remaining(buy), remaining(sell));
        if (qty <= 0) continue;
        const cost = qty * 100 * sell.price;
        if ((buyer[0]?.walletDzd ?? 0) < cost) continue; // buyer cannot pay
        await executeTrade(buy, sell, qty);
        crossed = true;
        break outer;
      }
    }
    if (!crossed) break;
  }
}

/* -------------------------------- place order ------------------------------ */

export interface PlaceOrderInput {
  userId: number;
  side: "buy" | "sell";
  grade: Grade;
  quantityQuintals: number;
  price: number;
  receiptId?: number | null;
  wilayaId?: number | null;
}

export async function placeOrder(input: PlaceOrderInput) {
  const qty = Math.floor(input.quantityQuintals);
  const price = Math.floor(input.price);
  if (!qty || qty <= 0) throw new Error("INVALID_QTY");
  if (!price || price <= 0) throw new Error("INVALID_PRICE");

  const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error("NO_USER");

  let receiptId: number | null = null;
  if (input.side === "sell" && input.receiptId) {
    const rs = await db.select().from(receipts).where(eq(receipts.id, input.receiptId)).limit(1);
    const r = rs[0];
    if (!r || r.holderId !== user.id) throw new Error("RECEIPT_NOT_OWNED");
    if (r.status !== "active") throw new Error("RECEIPT_NOT_AVAILABLE");
    if (qty > r.availableQuantityQuintals) throw new Error("RECEIPT_QTY");
    receiptId = r.id;
  }

  if (input.side === "buy") {
    const need = qty * 100 * price;
    if (user.walletDzd < need) throw new Error("INSUFFICIENT_FUNDS");
  }

  const created = await db
    .insert(orders)
    .values({
      ref: genRef("ORD"),
      userId: input.userId,
      side: input.side,
      orderType: "limit",
      grade: input.grade,
      quantityQuintals: qty,
      price,
      receiptId,
      wilayaId: input.wilayaId ?? user.wilayaId ?? null,
      status: "open",
    })
    .returning();

  await ensureMarketMakers();
  await matchGrade(input.grade);
  return created[0];
}

export async function cancelOrder(orderId: number, userId: number, isAdmin: boolean) {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const o = rows[0];
  if (!o) throw new Error("NOT_FOUND");
  if (o.userId !== userId && !isAdmin) throw new Error("FORBIDDEN");
  if (o.status !== "open" && o.status !== "partial") throw new Error("NOT_CANCELLABLE");
  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
}

/* -------------------------------- market tick ------------------------------ */

export async function marketTick() {
  await ensureMarketMakers();
  const settings = await db.select().from(marketSettings);
  const marketUsers = await db
    .select()
    .from(users)
    .where(inArray(users.role, ["trader", "farmer", "processor"]));

  for (const s of settings) {
    const events = rnd(1, 3);
    for (let i = 0; i < events; i++) {
      // mean-reverting noisy price
      const shock = rnd(-3, 3);
      const meanPull = Math.round((s.floorPrice + s.ceilingPrice - 2 * s.referencePrice) / 14);
      const desired = Math.min(s.ceilingPrice + 2, Math.max(s.floorPrice - 2, s.referencePrice + shock + meanPull));

      // aggressive order that crosses the spread ~70% of the time
      const aggressive = Math.random() < 0.7;
      const side: "buy" | "sell" = Math.random() < 0.5 ? "buy" : "sell";
      const actor = pick(marketUsers.filter((u) => (side === "buy" ? u.walletDzd > 5_000_000 : true)));
      if (!actor) continue;
      const qty = rnd(5, 120);

      let price: number;
      if (aggressive) {
        price = side === "buy" ? Math.min(desired + rnd(0, 2), s.ceilingPrice + 1) : Math.max(desired - rnd(0, 2), s.floorPrice - 1);
      } else {
        price = side === "buy" ? desired - rnd(1, 3) : desired + rnd(1, 3);
      }
      price = Math.max(10, price);

      if (side === "buy" && actor.walletDzd < qty * 100 * price) continue;

      await db.insert(orders).values({
        ref: genRef("ORD"),
        userId: actor.id,
        side,
        orderType: "limit",
        grade: s.grade,
        quantityQuintals: qty,
        price,
        wilayaId: actor.wilayaId,
        status: "open",
      });
    }
    await matchGrade(s.grade);
    await db
      .update(marketSettings)
      .set({ tickCount: sql`${marketSettings.tickCount} + 1` })
      .where(eq(marketSettings.id, s.id));
  }
  await ensureMarketMakers();
}

/* --------------------------------- auctions -------------------------------- */

export async function placeBid(auctionId: number, userId: number, price: number, qty: number) {
  const a = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!a[0] || a[0].status !== "open") throw new Error("AUCTION_CLOSED");
  if (price <= 0 || qty <= 0) throw new Error("INVALID_BID");
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if ((user[0]?.walletDzd ?? 0) < qty * 100 * price) throw new Error("INSUFFICIENT_FUNDS");
  await db.insert(auctionBids).values({ auctionId, userId, price, quantityQuintals: qty });
}

export async function settleAuction(auctionId: number) {
  const a = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  const auction = a[0];
  if (!auction || auction.status !== "open") throw new Error("AUCTION_NOT_OPEN");

  const bids = await db
    .select()
    .from(auctionBids)
    .where(eq(auctionBids.auctionId, auctionId))
    .orderBy(desc(auctionBids.price), asc(auctionBids.createdAt));

  const winner = bids[0];
  if (!winner) {
    await db.update(auctions).set({ status: "cancelled" }).where(eq(auctions.id, auctionId));
    throw new Error("NO_BIDS");
  }

  const qty = Math.min(auction.quantityQuintals, winner.quantityQuintals);
  const price = winner.price;
  const value = qty * 100 * price;

  const buyOrder = await db
    .insert(orders)
    .values({
      ref: genRef("ORD"),
      userId: winner.userId,
      side: "buy",
      orderType: "auction",
      grade: auction.grade,
      quantityQuintals: qty,
      filledQuintals: qty,
      price,
      auctionId: auction.id,
      status: "filled",
    })
    .returning();
  const sellOrder = await db
    .insert(orders)
    .values({
      ref: genRef("ORD"),
      userId: auction.sellerId ?? (await getStateUser()).id,
      side: "sell",
      orderType: "auction",
      grade: auction.grade,
      quantityQuintals: qty,
      filledQuintals: qty,
      price,
      auctionId: auction.id,
      status: "filled",
    })
    .returning();

  await db
    .update(users)
    .set({ walletDzd: sql`${users.walletDzd} - ${value}` })
    .where(eq(users.id, winner.userId));
  await db
    .update(users)
    .set({ walletDzd: sql`${users.walletDzd} + ${value}` })
    .where(eq(users.id, sellOrder[0].userId));

  await db.insert(trades).values({
    ref: genRef("TRD"),
    buyOrderId: buyOrder[0].id,
    sellOrderId: sellOrder[0].id,
    buyerId: winner.userId,
    sellerId: sellOrder[0].userId,
    grade: auction.grade,
    quantityQuintals: qty,
    price,
    auctionId: auction.id,
    status: "settled",
  });

  await db
    .update(auctions)
    .set({ status: "settled", settlePrice: price, winnerId: winner.userId })
    .where(eq(auctions.id, auctionId));

  await recordBar(auction.grade, price, qty, false);
  return { price, qty };
}

/* ----------------------------- receipts / lots ----------------------------- */

export interface DepositInput {
  farmerId: number;
  coldStoreId: number;
  operatorId: number;
  grade: Grade;
  variety: string;
  quantityQuintals: number;
  qualityScore: number;
}

export async function issueReceipt(input: DepositInput) {
  const qty = Math.floor(input.quantityQuintals);
  if (qty <= 0) throw new Error("INVALID_QTY");
  const stores = await db.select().from(coldStores).where(eq(coldStores.id, input.coldStoreId)).limit(1);
  const store = stores[0];
  if (!store) throw new Error("NO_STORE");
  if (store.usedQuintals + qty > store.capacityQuintals) throw new Error("STORE_FULL");

  const lotCode = genRef("LOT", 5);
  const lot = await db
    .insert(potatoLots)
    .values({
      code: lotCode,
      farmerId: input.farmerId,
      wilayaId: store.wilayaId,
      variety: input.variety,
      grade: input.grade,
      quantityQuintals: qty,
      qualityScore: Math.min(100, Math.max(40, Math.floor(input.qualityScore))),
      inspection: "inspected",
      harvestDate: new Date(),
    })
    .returning();

  await db
    .update(coldStores)
    .set({ usedQuintals: sql`${coldStores.usedQuintals} + ${qty}` })
    .where(eq(coldStores.id, store.id));

  const receiptCode = `EWR-${new Date().getFullYear()}-${genRef("", 4).slice(1)}`;
  const receipt = await db
    .insert(receipts)
    .values({
      code: receiptCode,
      lotId: lot[0].id,
      coldStoreId: store.id,
      issuerId: input.operatorId,
      holderId: input.farmerId,
      grade: input.grade,
      totalQuantityQuintals: qty,
      availableQuantityQuintals: qty,
      status: "active",
    })
    .returning();

  const events: Array<[string, string, string]> = [
    ["harvest", "حصاد الدفعة من الحقل", "Lot harvested from field"],
    ["inspection", `معاينة الجودة — نقطة ${input.qualityScore}/100`, `Quality inspection — score ${input.qualityScore}/100`],
    ["intake", `استلام في ${store.nameAr}`, `Intake at ${store.nameEn}`],
    ["storage", "تخزين مبرد وربط رقمي بالمنصة", "Cold storage and digital onboarding"],
    ["receipt", `إصدار الإيصال الإلكتروني ${receiptCode}`, `Electronic receipt issued ${receiptCode}`],
  ];
  for (const [type, ar, en] of events) {
    await db.insert(lotEvents).values({
      lotId: lot[0].id,
      type,
      labelAr: ar,
      labelEn: en,
      locationAr: store.nameAr,
      locationEn: store.nameEn,
    });
  }
  return receipt[0];
}

export async function pledgeReceipt(receiptId: number, bankId: number) {
  const rs = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, receiptId), eq(receipts.status, "active")))
    .limit(1);
  const r = rs[0];
  if (!r) throw new Error("RECEIPT_NOT_PLEDGEABLE");
  const setting = await db
    .select()
    .from(marketSettings)
    .where(eq(marketSettings.grade, r.grade))
    .limit(1);
  const refPrice = setting[0]?.referencePrice ?? 45;
  const value = r.totalQuantityQuintals * 100 * refPrice;
  const loan = Math.round(value * 0.7);

  await db.transaction(async (tx) => {
    await tx
      .update(receipts)
      .set({ status: "pledged", pledgedBankId: bankId, pledgeAmountDzd: loan })
      .where(eq(receipts.id, r.id));
    await tx
      .update(users)
      .set({ walletDzd: sql`${users.walletDzd} + ${loan}` })
      .where(eq(users.id, r.holderId));
    await tx.insert(lotEvents).values({
      lotId: r.lotId,
      type: "pledge",
      labelAr: `رهن الإيصال لدى البنك — تمويل ${loan.toLocaleString("en-US")} دج`,
      labelEn: `Receipt pledged to bank — financing ${loan.toLocaleString("en-US")} DZD`,
    });
  });
}

export async function releasePledge(receiptId: number) {
  const rs = await db.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1);
  const r = rs[0];
  if (!r || r.status !== "pledged") throw new Error("NOT_PLEDGED");
  await db.transaction(async (tx) => {
    if (r.pledgeAmountDzd) {
      await tx
        .update(users)
        .set({ walletDzd: sql`${users.walletDzd} - ${r.pledgeAmountDzd}` })
        .where(eq(users.id, r.holderId));
    }
    await tx
      .update(receipts)
      .set({ status: "active", pledgedBankId: null, pledgeAmountDzd: null })
      .where(eq(receipts.id, r.id));
    await tx.insert(lotEvents).values({
      lotId: r.lotId,
      type: "receipt",
      labelAr: "فك رهن الإيصال وعودته لحائزه",
      labelEn: "Pledge released, receipt returned to holder",
    });
  });
}

/* ------------------------------ state intervention ------------------------- */

export async function updateBand(
  grade: Grade,
  floor: number,
  ceiling: number,
  enabled: boolean,
  operatorId: number,
  reasonAr: string,
  reasonEn: string,
) {
  if (floor >= ceiling) throw new Error("INVALID_BAND");
  const before = await db.select().from(marketSettings).where(eq(marketSettings.grade, grade)).limit(1);
  await db
    .update(marketSettings)
    .set({ floorPrice: floor, ceilingPrice: ceiling, marketMakerEnabled: enabled })
    .where(eq(marketSettings.grade, grade));
  await db.insert(interventions).values({
    type: "set_band",
    grade,
    floorPrice: floor,
    ceilingPrice: ceiling,
    beforePrice: before[0]?.referencePrice ?? null,
    afterPrice: before[0]?.referencePrice ?? null,
    stateStockAfter: before[0]?.stateStockQuintals ?? 0,
    reasonAr,
    reasonEn,
    operatorId,
  });
  await ensureMarketMakers();
}

export async function directIntervention(
  type: "buy" | "sell",
  grade: Grade,
  price: number,
  qty: number,
  operatorId: number,
  reasonAr: string,
  reasonEn: string,
) {
  const state = await getStateUser();
  const settingRows = await db.select().from(marketSettings).where(eq(marketSettings.grade, grade)).limit(1);
  const setting = settingRows[0];
  if (!setting) throw new Error("NO_SETTING");
  const beforePrice = setting.referencePrice;

  const order = await db
    .insert(orders)
    .values({
      ref: genRef("ORD"),
      userId: state.id,
      side: type,
      orderType: "state",
      grade,
      quantityQuintals: qty,
      price,
      status: "open",
    })
    .returning();

  await matchGrade(grade);

  const after = await db.select().from(marketSettings).where(eq(marketSettings.grade, grade)).limit(1);
  await db.insert(interventions).values({
    type,
    grade,
    price,
    quantityQuintals: qty,
    beforePrice,
    afterPrice: after[0].referencePrice,
    stateStockAfter: after[0].stateStockQuintals,
    reasonAr,
    reasonEn,
    operatorId,
  });
  await ensureMarketMakers();
  return order[0];
}
