import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ============================ Enums ============================ */

export const roleEnum = pgEnum("role", [
  "farmer",
  "trader",
  "state",
  "warehouse",
  "bank",
  "processor",
  "admin",
]);

export const gradeEnum = pgEnum("grade", ["A", "B", "C"]);

export const orderSideEnum = pgEnum("order_side", ["buy", "sell"]);
export const orderTypeEnum = pgEnum("order_type", ["limit", "auction", "state"]);
export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "partial",
  "filled",
  "cancelled",
]);

export const auctionStatusEnum = pgEnum("auction_status", [
  "open",
  "settled",
  "cancelled",
]);

export const receiptStatusEnum = pgEnum("receipt_status", [
  "active",
  "pledged",
  "transferred",
  "delivered",
]);

export const tradeStatusEnum = pgEnum("trade_status", [
  "matched",
  "delivered",
  "settled",
  "cancelled",
]);

export const inspectionEnum = pgEnum("inspection_status", [
  "pending",
  "inspected",
  "rejected",
]);

export const interventionTypeEnum = pgEnum("intervention_type", [
  "buy",
  "sell",
  "set_band",
]);

export type Grade = "A" | "B" | "C";

/* ============================ Geography ============================ */

export const wilayas = pgTable("wilayas", {
  id: serial("id").primaryKey(),
  code: integer("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  region: text("region").notNull(), // desert / coastal / highlands
  majorProducer: boolean("major_producer").notNull().default(false),
  lat: numeric("lat", { precision: 8, scale: 4 }),
  lng: numeric("lng", { precision: 8, scale: 4 }),
});

/* ============================ Users ============================ */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  orgAr: text("org_ar"),
  orgEn: text("org_en"),
  role: roleEnum("role").notNull(),
  wilayaId: integer("wilaya_id").references(() => wilayas.id),
  phone: text("phone"),
  nrc: text("nrc"), // CNRC commercial register
  walletDzd: bigint("wallet_dzd", { mode: "number" }).notNull().default(0),
  creditLimitDzd: bigint("credit_limit_dzd", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ Cold stores ============================ */

export const coldStores = pgTable("cold_stores", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  wilayaId: integer("wilaya_id")
    .notNull()
    .references(() => wilayas.id),
  operatorId: integer("operator_id").references(() => users.id),
  capacityQuintals: integer("capacity_quintals").notNull(),
  usedQuintals: integer("used_quintals").notNull().default(0),
  temperatureC: numeric("temperature_c", { precision: 4, scale: 1 }).notNull().default("4.0"),
  certified: boolean("certified").notNull().default(true),
  connected: boolean("connected").notNull().default(true),
  publicStore: boolean("public_store").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ Lots & traceability ============================ */

export const potatoLots = pgTable("potato_lots", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  farmerId: integer("farmer_id")
    .notNull()
    .references(() => users.id),
  wilayaId: integer("wilaya_id")
    .notNull()
    .references(() => wilayas.id),
  variety: text("variety").notNull(), // Spunta, Agria, Bartina, Safran...
  grade: gradeEnum("grade").notNull(),
  quantityQuintals: integer("quantity_quintals").notNull(),
  qualityScore: integer("quality_score").notNull().default(80),
  inspection: inspectionEnum("inspection").notNull().default("pending"),
  harvestDate: timestamp("harvest_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lotEvents = pgTable("lot_events", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id")
    .notNull()
    .references(() => potatoLots.id),
  type: text("type").notNull(), // harvest | inspection | intake | storage | receipt | trade | pledge | delivery
  labelAr: text("label_ar").notNull(),
  labelEn: text("label_en").notNull(),
  locationAr: text("location_ar"),
  locationEn: text("location_en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ Warehouse receipts ============================ */

export const receipts = pgTable("warehouse_receipts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // EWR-XXXX-XXXX
  lotId: integer("lot_id")
    .notNull()
    .references(() => potatoLots.id),
  coldStoreId: integer("cold_store_id")
    .notNull()
    .references(() => coldStores.id),
  issuerId: integer("issuer_id")
    .notNull()
    .references(() => users.id),
  holderId: integer("holder_id")
    .notNull()
    .references(() => users.id),
  grade: gradeEnum("grade").notNull(),
  totalQuantityQuintals: integer("total_quantity_quintals").notNull(),
  availableQuantityQuintals: integer("available_quantity_quintals").notNull(),
  status: receiptStatusEnum("status").notNull().default("active"),
  pledgedBankId: integer("pledged_bank_id").references(() => users.id),
  pledgeAmountDzd: bigint("pledge_amount_dzd", { mode: "number" }),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ Market settings singleton ============================ */

export const marketSettings = pgTable("market_settings", {
  id: serial("id").primaryKey(),
  grade: gradeEnum("grade").notNull().unique(),
  referencePrice: integer("reference_price").notNull(), // DZD / kg
  floorPrice: integer("floor_price").notNull(),
  ceilingPrice: integer("ceiling_price").notNull(),
  marketMakerEnabled: boolean("market_maker_enabled").notNull().default(true),
  stateStockQuintals: integer("state_stock_quintals").notNull().default(0),
  tickCount: integer("tick_count").notNull().default(0),
});

/* ============================ Price history ============================ */

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    day: text("day").notNull(), // YYYY-MM-DD
    grade: gradeEnum("grade").notNull(),
    openPrice: integer("open_price").notNull(),
    highPrice: integer("high_price").notNull(),
    lowPrice: integer("low_price").notNull(),
    closePrice: integer("close_price").notNull(),
    volumeQuintals: integer("volume_quintals").notNull().default(0),
    stateIntervened: boolean("state_intervened").notNull().default(false),
  },
  (t) => [uniqueIndex("price_history_day_grade_idx").on(t.day, t.grade)],
);

/* ============================ Auctions ============================ */

export const auctions = pgTable("auctions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  grade: gradeEnum("grade").notNull(),
  quantityQuintals: integer("quantity_quintals").notNull(),
  sellerId: integer("seller_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: auctionStatusEnum("status").notNull().default("open"),
  settlePrice: integer("settle_price"),
  winnerId: integer("winner_id").references(() => users.id),
  noteAr: text("note_ar"),
  noteEn: text("note_en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auctionBids = pgTable("auction_bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id")
    .notNull()
    .references(() => auctions.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  price: integer("price").notNull(),
  quantityQuintals: integer("quantity_quintals").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ Orders & trades ============================ */

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull().unique(), // ORD-XXXXXX
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  side: orderSideEnum("side").notNull(),
  orderType: orderTypeEnum("order_type").notNull().default("limit"),
  grade: gradeEnum("grade").notNull(),
  quantityQuintals: integer("quantity_quintals").notNull(),
  filledQuintals: integer("filled_quintals").notNull().default(0),
  price: integer("price"), // DZD / kg, null for auction market orders
  status: orderStatusEnum("status").notNull().default("open"),
  receiptId: integer("receipt_id").references(() => receipts.id),
  auctionId: integer("auction_id").references(() => auctions.id),
  wilayaId: integer("wilaya_id").references(() => wilayas.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull().unique(), // TRD-XXXXXX
  buyOrderId: integer("buy_order_id").references(() => orders.id),
  sellOrderId: integer("sell_order_id").references(() => orders.id),
  buyerId: integer("buyer_id")
    .notNull()
    .references(() => users.id),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => users.id),
  grade: gradeEnum("grade").notNull(),
  quantityQuintals: integer("quantity_quintals").notNull(),
  price: integer("price").notNull(),
  receiptId: integer("receipt_id").references(() => receipts.id),
  auctionId: integer("auction_id").references(() => auctions.id),
  status: tradeStatusEnum("status").notNull().default("settled"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ State interventions ============================ */

export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  type: interventionTypeEnum("type").notNull(),
  grade: gradeEnum("grade").notNull(),
  price: integer("price"),
  quantityQuintals: integer("quantity_quintals").notNull().default(0),
  floorPrice: integer("floor_price"),
  ceilingPrice: integer("ceiling_price"),
  beforePrice: integer("before_price"),
  afterPrice: integer("after_price"),
  stateStockAfter: integer("state_stock_after"),
  reasonAr: text("reason_ar").notNull(),
  reasonEn: text("reason_en").notNull(),
  operatorId: integer("operator_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================ Relations ============================ */

export const wilayaRelations = relations(wilayas, ({ many }) => ({
  users: many(users),
  coldStores: many(coldStores),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  wilaya: one(wilayas, { fields: [users.wilayaId], references: [wilayas.id] }),
  orders: many(orders),
}));

export const coldStoreRelations = relations(coldStores, ({ one }) => ({
  wilaya: one(wilayas, { fields: [coldStores.wilayaId], references: [wilayas.id] }),
}));

export const lotRelations = relations(potatoLots, ({ one, many }) => ({
  farmer: one(users, { fields: [potatoLots.farmerId], references: [users.id] }),
  wilaya: one(wilayas, { fields: [potatoLots.wilayaId], references: [wilayas.id] }),
  events: many(lotEvents),
  receipts: many(receipts),
}));

export const receiptRelations = relations(receipts, ({ one }) => ({
  lot: one(potatoLots, { fields: [receipts.lotId], references: [potatoLots.id] }),
  coldStore: one(coldStores, { fields: [receipts.coldStoreId], references: [coldStores.id] }),
  holder: one(users, { fields: [receipts.holderId], references: [users.id] }),
}));
