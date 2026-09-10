import "dotenv/config";
import { db } from "../src/db";
import {
  wilayas,
  users,
  coldStores,
  potatoLots,
  lotEvents,
  receipts,
  marketSettings,
  priceHistory,
  auctions,
  auctionBids,
  orders,
  trades,
  interventions,
} from "../src/db/schema";
import bcrypt from "bcryptjs";
import { ensureMarketMakers, matchGrade } from "../src/lib/engine";
import { eq } from "drizzle-orm";

const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(a: T[]) => a[rnd(0, a.length - 1)];
const daysAgo = (n: number, h = 12) => {
  const d = new Date(Date.now() - n * 86400000);
  d.setHours(h, rnd(0, 59), 0, 0);
  return d;
};
const dayStr = (n: number) => daysAgo(n).toISOString().slice(0, 10);
const ref = (p: string, n = 6) =>
  `${p}-${Math.floor(Math.random() * 10 ** n).toString().padStart(n, "0")}`;

async function main() {
  console.log("→ Resetting tables…");
  await db.execute(`TRUNCATE TABLE
    lot_events, warehouse_receipts, potato_lots, auction_bids, auctions, trades, orders,
    interventions, price_history, market_settings, cold_stores, users, wilayas
    RESTART IDENTITY CASCADE`);

  /* ------------------------------- wilayas ------------------------------- */
  const wdata = [
    [2, "الشلف", "Chlef", "coastal", false, 36.16, 1.33],
    [5, "باتنة", "Batna", "highlands", false, 35.55, 6.17],
    [7, "بسكرة", "Biskra", "desert", false, 34.85, 5.73],
    [9, "البليدة", "Blida", "coastal", false, 36.47, 2.83],
    [10, "البويرة", "Bouira", "highlands", false, 36.37, 3.9],
    [16, "الجزائر", "Algiers", "coastal", false, 36.75, 3.06],
    [19, "سطيف", "Sétif", "highlands", false, 36.19, 5.41],
    [21, "سكيكدة", "Skikda", "coastal", true, 36.88, 6.91],
    [27, "مستغانم", "Mostaganem", "coastal", true, 35.93, 0.09],
    [29, "معسكر", "Mascara", "coastal", true, 35.4, 0.13],
    [30, "ورقلة", "Ouargla", "desert", false, 31.95, 5.33],
    [31, "وهران", "Oran", "coastal", false, 35.7, -0.63],
    [35, "بومرداس", "Boumerdès", "coastal", false, 36.76, 3.48],
    [39, "وادي سوف", "El Oued", "desert", true, 33.37, 6.87],
    [42, "تيبازة", "Tipaza", "coastal", false, 36.59, 2.45],
    [44, "عين الدفلى", "Aïn Defla", "highlands", true, 36.27, 1.96],
    [47, "غرداية", "Ghardaïa", "desert", false, 32.49, 3.67],
    [48, "غليزان", "Relizane", "highlands", true, 35.74, 0.56],
  ] as const;
  await db.insert(wilayas).values(
    wdata.map(([code, nameAr, nameEn, region, mp, lat, lng]) => ({
      code, nameAr, nameEn, region, majorProducer: mp, lat: String(lat), lng: String(lng),
    })),
  );
  const wRows = await db.select().from(wilayas);
  const w = (code: number) => wRows.find((x) => x.code === code)!;

  /* -------------------------------- users -------------------------------- */
  const pw = await hashPassword("algerie2026");
  const u = (
    email: string,
    nameAr: string,
    nameEn: string,
    role: (typeof users.$inferSelect)["role"],
    wilayaCode: number | null,
    wallet: number,
    orgAr?: string,
    orgEn?: string,
    phone?: string,
    nrc?: string,
  ) => ({
    email, passwordHash: pw, nameAr, nameEn, role,
    wilayaId: wilayaCode ? w(wilayaCode).id : null,
    walletDzd: wallet, orgAr, orgEn, phone, nrc,
  });

  await db.insert(users).values([
    u("onilev@platform.dz", "الديوان الوطني المهني المشترك للخضرو واللحوم", "ONILEV — National Inter-professional Office", "state", 16, 80_000_000_000,
      "ONILEV / SARPA — صانع السوق العمومي", "ONILEV / SARPA — Public market maker", "021-71-00-00", "OFF/PUB/001"),
    u("regulator@hcn.dz", "المحافظة السامية للرقمنة", "High Commission for Digitization", "admin", 16, 0,
      "هيئة الضبط والحوكمة", "Regulation & governance", "021-00-00-00", "HCN-ADMIN"),
    u("ammari@platform.dz", "عبد القادر عماري", "Abdelkader Ammari", "farmer", 39, 8_400_000,
      "تعااعية النور الفلاحية", "En-Nour farming cooperative", "0551-40-22-11", "39/00/18452"),
    u("belkacem@platform.dz", "يوسف بلقاسم", "Youssef Belkacem", "farmer", 44, 3_900_000,
      "مستثمرة بلقاسم الفلاحية", "Belkacem farm", "0550-88-12-73", "44/00/09912"),
    u("messaoud@platform.dz", "الحاج مسعود شريف", "Hadj Messaoud Cherif", "farmer", 27, 12_700_000,
      "ضيعـة الواحة الخضراء", "Green Oasis farm", "0560-12-77-41", "27/00/22018"),
    u("bouzid@platform.dz", "فاطمة الزهراء بوزيد", "Fatima-Zohra Bouzid", "farmer", 29, 2_100_000,
      "تعاونية الأمل النسوية", "Al-Amal women's cooperative", "0661-33-90-26", "29/00/30125"),
    u("benchiha@platform.dz", "مؤسسة بن شيحة للتجارة", "Benchiha Trading EURL", "trader", 16, 2_800_000_000,
      "تاجر جملة معتمد", "Certified wholesaler", "0770-45-66-20", "16/00/1188234"),
    u("agro@platform.dz", "شركة أغرو ديستربيوسيون", "Agro Distribution SARL", "trader", 31, 2_200_000_000,
      "توزيع وطني", "National distribution", "0555-90-12-44", "31/00/1409871"),
    u("hauts@platform.dz", "شركة الهضاب للتوزيع", "Hauts-Plateaux Distribution", "trader", 19, 1_600_000_000,
      "توزيع بالهضاب العليا", "High-plateaus distribution", "0771-22-80-19", "19/00/0765542"),
    u("store1@platform.dz", "مخزن البركة للتبريد", "Al Baraka Cold Store", "warehouse", 27, 0,
      "مستودع تبريد معتمد", "Certified cold warehouse", "045-21-40-08", "27/00/0554218"),
    u("store2@platform.dz", "مخزن وادي سوف المبرد", "Souf Refrigerated Warehouse", "warehouse", 39, 0,
      "مستودع تبريد معتمد", "Certified cold warehouse", "032-74-10-50", "39/00/0612004"),
    u("store3@platform.dz", "المخزن الجهوي عين الدفلى", "Aïn Defla Regional Warehouse", "warehouse", 44, 0,
      "مستودع عمومي معتمد", "Certified public warehouse", "027-39-88-12", "44/00/0339910"),
    u("bna@platform.dz", "البنك الوطني الجزائري", "Banque Nationale d'Algérie (BNA)", "bank", 16, 30_000_000_000,
      "وكالة التمويل الفلاحي", "Agricultural finance branch", "021-62-50-00", "BANK/BNA"),
    u("badr@platform.dz", "بنك الفلاحة والتنمية الريفية", "BADR Rural Development Bank", "bank", 44, 25_000_000_000,
      "تمويل تعاونيات ومستثمرات", "Farm & cooperative financing", "027-39-20-20", "BANK/BADR"),
    u("crispy@platform.dz", "مؤسسة كريسبي للتحويل الغذائي", "Crispy Food Processing", "processor", 9, 1_400_000_000,
      "تحويل صناعي — رقائق بطاطا", "Industrial processing — crisps", "025-20-81-40", "09/00/1288044"),
  ]);
  const us = await db.select().from(users);
  const findU = (email: string) => us.find((x) => x.email === email)!;

  /* ------------------------------ cold stores ----------------------------- */
  const sd = [
    ["CS-001", "مخزن وادي سوف المبرد", "Souf Refrigerated Warehouse", 39, "store2@platform.dz", 180000, 121000, 3.8, true, true],
    ["CS-002", "المخزن الجهوي عين الدفلى", "Aïn Defla Regional Warehouse", 44, "store3@platform.dz", 150000, 98000, 4.1, true, true],
    ["CS-003", "مخزن البركة للتبريد", "Al Baraka Cold Store", 27, "store1@platform.dz", 90000, 54000, 4.4, true, false],
    ["CS-004", "المخزن العمومي مستغانم", "Mostaganem Public Warehouse", 27, "store1@platform.dz", 120000, 72000, 4.0, true, true],
    ["CS-005", "مخزن معسكر للتبريد", "Mascara Cold Store", 29, null, 100000, 61000, 3.6, true, false],
    ["CS-006", "مخزن سكيكدة الساحلي", "Skikda Coastal Warehouse", 21, null, 80000, 33000, 4.8, true, false],
    ["CS-007", "مخزن الشلف الجهوي", "Chlef Regional Store", 2, null, 70000, 41000, 4.2, true, true],
    ["CS-008", "مخزن بسكرة المبرد", "Biskra Cold Store", 7, null, 60000, 28000, 5.0, true, false],
    ["CS-009", "مخزن غليزان", "Relizane Warehouse", 48, null, 50000, 22000, 4.3, true, false],
    ["CS-010", "المخزن الصناعي البليدة", "Blida Industrial Warehouse", 9, null, 90000, 70000, 5.2, true, false],
    ["CS-011", "مخزن سطيف العمومي", "Sétif Public Store", 19, null, 55000, 20000, 3.9, true, true],
    ["CS-012", "المخزن الاستراتيجي الوطني", "National Strategic Warehouse", 10, null, 250000, 155000, 3.5, true, true],
  ] as const;
  await db.insert(coldStores).values(
    sd.map(([code, nameAr, nameEn, wc, opEmail, cap, used, temp, cert, pub]) => ({
      code, nameAr, nameEn,
      wilayaId: w(wc as number).id,
      operatorId: opEmail ? findU(opEmail as string).id : findU("onilev@platform.dz").id,
      capacityQuintals: cap as number,
      usedQuintals: used as number,
      temperatureC: String(temp),
      certified: cert as boolean,
      connected: true,
      publicStore: pub as boolean,
    })),
  );
  const stores = await db.select().from(coldStores);
  const storeByCode = (c: string) => stores.find((x) => x.code === c)!;

  /* ---------------------------- market settings --------------------------- */
  await db.insert(marketSettings).values([
    { grade: "A", referencePrice: 67, floorPrice: 55, ceilingPrice: 85, marketMakerEnabled: true, stateStockQuintals: 42000 },
    { grade: "B", referencePrice: 47, floorPrice: 35, ceilingPrice: 60, marketMakerEnabled: true, stateStockQuintals: 95000 },
    { grade: "C", referencePrice: 28, floorPrice: 20, ceilingPrice: 38, marketMakerEnabled: true, stateStockQuintals: 18000 },
  ]);

  /* ----------------------------- price history ---------------------------- */
  const bands: Record<string, [number, number, number]> = {
    A: [67, 55, 85],
    B: [47, 35, 60],
    C: [28, 20, 38],
  };
  const gradeVariety: Record<string, string[]> = {
    A: ["Agria", "Spunta", "Safran"],
    B: ["Spunta", "Bartina", "Alaska"],
    C: ["Bartina", "Alaska", "Spunta"],
  };

  for (const g of ["A", "B", "C"] as const) {
    const [mean, floor, ceil] = bands[g];
    let close = mean - 4;
    for (let n = 119; n >= 0; n--) {
      const seasonal = Math.sin((119 - n) / 18) * 3.5;
      const shock = rnd(-4, 4);
      const pull = (mean - close) / 9;
      let open = close;
      close = Math.round(close + pull + shock + seasonal * 0.25);
      const high = Math.max(open, close) + rnd(0, 3);
      const low = Math.min(open, close) - rnd(0, 3);
      const intervened = low <= floor + 2 || high >= ceil - 2;
      if (intervened) close = Math.min(ceil - 1, Math.max(floor + 1, close));
      const vol = rnd(2200, 11000) + (intervened ? rnd(3000, 9000) : 0);
      await db.insert(priceHistory).values({
        day: dayStr(n),
        grade: g,
        openPrice: open,
        highPrice: Math.max(high, open, close),
        lowPrice: Math.max(8, Math.min(low, open, close)),
        closePrice: close,
        volumeQuintals: vol,
        stateIntervened: intervened,
      });
    }
  }

  /* ----------------------- lots, receipts, traceability ------------------- */
  const stateUser = findU("onilev@platform.dz");
  let receiptCounter = 1;
  async function makeReceipt(opts: {
    farmer: string; store: string; grade: "A" | "B" | "C"; qty: number; variety: string;
    quality: number; daysAgoN: number; status: "active" | "pledged" | "transferred" | "delivered";
    pledgeBank?: string; holder?: string; events?: string[];
  }) {
    const farmer = findU(opts.farmer);
    const store = storeByCode(opts.store);
    const lot = await db.insert(potatoLots).values({
      code: `LOT-${String(receiptCounter).padStart(5, "0")}`,
      farmerId: farmer.id,
      wilayaId: store.wilayaId,
      variety: opts.variety,
      grade: opts.grade,
      quantityQuintals: opts.qty,
      qualityScore: opts.quality,
      inspection: "inspected",
      harvestDate: daysAgo(opts.daysAgoN + 6),
      createdAt: daysAgo(opts.daysAgoN + 6, 8),
    }).returning();
    const rcode = `EWR-2026-${String(receiptCounter).padStart(4, "0")}`;
    receiptCounter++;
    const avail = opts.status === "transferred" || opts.status === "delivered" ? 0 : opts.qty;
    const pledgeAmount = opts.status === "pledged" && opts.pledgeBank
      ? Math.round(opts.qty * 100 * bands[opts.grade][0] * 0.7)
      : null;
    const holder = opts.holder ? findU(opts.holder) : farmer;
    const r = await db.insert(receipts).values({
      code: rcode,
      lotId: lot[0].id,
      coldStoreId: store.id,
      issuerId: store.operatorId ?? stateUser.id,
      holderId: holder.id,
      grade: opts.grade,
      totalQuantityQuintals: opts.qty,
      availableQuantityQuintals: avail,
      status: opts.status,
      pledgedBankId: opts.pledgeBank ? findU(opts.pledgeBank).id : null,
      pledgeAmountDzd: pledgeAmount,
      issueDate: daysAgo(opts.daysAgoN, 10),
      createdAt: daysAgo(opts.daysAgoN, 10),
    }).returning();

    const base: Array<[string, string, string, number]> = [
      ["harvest", "حصاد الدفعة من الحقل", "Lot harvested from field", opts.daysAgoN + 6],
      ["inspection", `معاينة الجودة — نقطة ${opts.quality}/100`, `Quality inspection — score ${opts.quality}/100`, opts.daysAgoN + 5],
      ["intake", `استلام في ${store.nameAr}`, `Intake at ${store.nameEn}`, opts.daysAgoN + 5],
      ["storage", "تخزين مبرد وربط رقمي", "Cold storage & digital onboarding", opts.daysAgoN + 5],
      ["receipt", `إصدار الإيصال ${rcode}`, `Receipt issued ${rcode}`, opts.daysAgoN],
    ];
    const extra: Array<[string, string, string, number]> = [];
    if (opts.status === "pledged") extra.push(["pledge", "رهن الإيصال لدى البنك والحصول على تمويل", "Receipt pledged, financing granted", opts.daysAgoN - 1]);
    if (opts.status === "transferred" || opts.status === "delivered") {
      extra.push(["traded", "تداول الإيصال في البورصة الوطنية", "Receipt traded on the national exchange", opts.daysAgoN - 1]);
    }
    if (opts.status === "delivered") extra.push(["delivery", "تسليم نهائي للمشتري", "Final delivery to buyer", opts.daysAgoN - 2]);
    for (const [type, ar, en, dn] of [...base, ...extra]) {
      await db.insert(lotEvents).values({
        lotId: lot[0].id, type, labelAr: ar, labelEn: en,
        locationAr: store.nameAr, locationEn: store.nameEn,
        createdAt: daysAgo(Math.max(0, dn), rnd(8, 16)),
      });
    }
    return { lot: lot[0], receipt: r[0] };
  }

  // Active receipts (sellable on the exchange)
  const r1 = await makeReceipt({ farmer: "ammari@platform.dz", store: "CS-001", grade: "A", qty: 320, variety: "Agria", quality: 94, daysAgoN: 3, status: "active" });
  const r2 = await makeReceipt({ farmer: "ammari@platform.dz", store: "CS-001", grade: "B", qty: 540, variety: "Spunta", quality: 86, daysAgoN: 4, status: "active" });
  const r3 = await makeReceipt({ farmer: "belkacem@platform.dz", store: "CS-002", grade: "B", qty: 410, variety: "Bartina", quality: 82, daysAgoN: 2, status: "active" });
  const r4 = await makeReceipt({ farmer: "messaoud@platform.dz", store: "CS-003", grade: "A", qty: 260, variety: "Safran", quality: 91, daysAgoN: 6, status: "active" });
  const r5 = await makeReceipt({ farmer: "messaoud@platform.dz", store: "CS-004", grade: "B", qty: 680, variety: "Spunta", quality: 79, daysAgoN: 5, status: "active" });
  const r6 = await makeReceipt({ farmer: "bouzid@platform.dz", store: "CS-005", grade: "C", qty: 350, variety: "Alaska", quality: 72, daysAgoN: 4, status: "active" });
  const r7 = await makeReceipt({ farmer: "belkacem@platform.dz", store: "CS-002", grade: "A", qty: 180, variety: "Agria", quality: 90, daysAgoN: 1, status: "active" });
  const r8 = await makeReceipt({ farmer: "bouzid@platform.dz", store: "CS-005", grade: "B", qty: 290, variety: "Spunta", quality: 84, daysAgoN: 7, status: "active" });
  // Pledged receipts (bank-financed)
  await makeReceipt({ farmer: "ammari@platform.dz", store: "CS-001", grade: "B", qty: 460, variety: "Spunta", quality: 88, daysAgoN: 14, status: "pledged", pledgeBank: "bna@platform.dz" });
  await makeReceipt({ farmer: "messaoud@platform.dz", store: "CS-004", grade: "A", qty: 220, variety: "Agria", quality: 92, daysAgoN: 12, status: "pledged", pledgeBank: "badr@platform.dz" });
  await makeReceipt({ farmer: "belkacem@platform.dz", store: "CS-002", grade: "C", qty: 380, variety: "Bartina", quality: 70, daysAgoN: 18, status: "pledged", pledgeBank: "badr@platform.dz" });
  // Historical transferred / delivered
  await makeReceipt({ farmer: "ammari@platform.dz", store: "CS-001", grade: "B", qty: 500, variety: "Spunta", quality: 85, daysAgoN: 32, status: "delivered", holder: "benchiha@platform.dz" });
  await makeReceipt({ farmer: "messaoud@platform.dz", store: "CS-003", grade: "A", qty: 240, variety: "Safran", quality: 93, daysAgoN: 26, status: "transferred", holder: "agro@platform.dz" });
  await makeReceipt({ farmer: "bouzid@platform.dz", store: "CS-005", grade: "C", qty: 420, variety: "Alaska", quality: 68, daysAgoN: 21, status: "delivered", holder: "crispy@platform.dz" });
  void r1; void r2; void r3; void r4; void r5; void r6; void r7; void r8;
  void gradeVariety;

  /* ------------------------------ past trades ----------------------------- */
  const marketPeople = us.filter((x) => ["trader", "farmer", "processor", "state"].includes(x.role));
  for (let i = 0; i < 140; i++) {
    const g = pick(["A", "B", "B", "B", "C"] as const);
    const [mean, floor, ceil] = bands[g];
    const price = Math.min(ceil - 1, Math.max(floor + 1, mean + rnd(-8, 8)));
    const qty = rnd(10, 260);
    const seller = pick(marketPeople);
    let buyer = pick(marketPeople);
    while (buyer.id === seller.id) buyer = pick(marketPeople);
    await db.insert(trades).values({
      ref: ref("TRD"),
      buyerId: buyer.id, sellerId: seller.id,
      grade: g, quantityQuintals: qty, price,
      status: "settled", createdAt: daysAgo(rnd(0, 20), rnd(7, 17)),
    });
  }

  /* --------------------------- interventions log -------------------------- */
  const interv: Array<[string, "A"|"B"|"C", number, number, number, string, string, number]> = [
    ["buy", "B", 36, 42000, 36, "وفرة موسمية وانهيار الأسعار — شراء لدعم الفلاحين", "Seasonal glut and price crash — support purchase", 64],
    ["buy", "A", 56, 18000, 56, "دعم سعر الدرجة الممتازة في بداية الإنتاج الصحراوي", "Support premium grade at start of desert harvest", 58],
    ["sell", "B", 59, 30000, 52, "ارتفاع حاد في الأسواق — طرح من المخزون الاستراتيجي", "Sharp market rise — release of strategic stock", 44],
    ["set_band", "B", 0, 0, 47, "مراجعة نطاق التدخل لموسم جديد", "Band review for the new season", 30],
    ["buy", "C", 21, 12000, 21, "شراء فائض الدرجة الصناعية لفائدة التحويل", "Industrial-grade surplus purchase for processing", 26],
    ["sell", "A", 84, 9000, 78, "ضغط على أسعار الدرجة الممتازة قبل رمضان", "Cooling premium prices ahead of Ramadan", 18],
    ["buy", "B", 35, 26000, 35, "تدخل وقائي عند الأرضية", "Preventive intervention at the floor", 9],
    ["sell", "B", 60, 24000, 53, "تزويد الأسواق خلال موجة البرد", "Supplying markets during a cold wave", 5],
  ];
  for (const [type, g, price, qty, after, ar, en, dn] of interv) {
    const [mean, floor, ceil] = bands[g];
    await db.insert(interventions).values({
      type: type as "buy" | "sell" | "set_band",
      grade: g,
      price: type === "set_band" ? null : price,
      quantityQuintals: qty,
      floorPrice: floor,
      ceilingPrice: ceil,
      beforePrice: type === "buy" ? floor + 1 : ceil - 2,
      afterPrice: after,
      stateStockAfter: 95000,
      reasonAr: ar, reasonEn: en,
      operatorId: stateUser.id,
      createdAt: daysAgo(dn, 10),
    });
  }

  /* ------------------------------- auctions ------------------------------- */
  // live auction today
  const closeAt = new Date();
  closeAt.setHours(11, 0, 0, 0);
  if (closeAt.getTime() < Date.now()) closeAt.setDate(closeAt.getDate() + 1);
  const liveAuction = await db.insert(auctions).values({
    code: "AUC-0009",
    grade: "B",
    quantityQuintals: 600,
    sellerId: findU("belkacem@platform.dz").id,
    scheduledAt: closeAt,
    status: "open",
    noteAr: "دفعة موحّدة من إنتاج عين الدفلى — درجة ب",
    noteEn: "Consolidated lot from Aïn Defla — Grade B",
  }).returning();
  const liveBids: Array<[string, number, number]> = [
    ["benchiha@platform.dz", 43, 200],
    ["agro@platform.dz", 44, 350],
    ["hauts@platform.dz", 45, 600],
    ["benchiha@platform.dz", 46, 600],
  ];
  for (const [email, price, qty] of liveBids) {
    await db.insert(auctionBids).values({
      auctionId: liveAuction[0].id, userId: findU(email).id, price, quantityQuintals: qty,
    });
  }
  // past settled auctions
  for (let i = 1; i <= 8; i++) {
    const g = pick(["A", "B", "B", "C"] as const);
    const [mean, floor, ceil] = bands[g];
    const settle = Math.min(ceil - 2, Math.max(floor + 2, mean + rnd(-5, 5)));
    const seller = pick(us.filter((x) => x.role === "farmer"));
    const winner = pick(us.filter((x) => ["trader", "processor"].includes(x.role)));
    const a = await db.insert(auctions).values({
      code: `AUC-000${8 - i + 1 - 0}`,
      grade: g,
      quantityQuintals: rnd(200, 800),
      sellerId: seller.id,
      scheduledAt: daysAgo(i, 11),
      status: "settled",
      settlePrice: settle,
      winnerId: winner.id,
    }).returning();
    for (const b of [settle - 3, settle - 1, settle]) {
      await db.insert(auctionBids).values({
        auctionId: a[0].id,
        userId: pick(us.filter((x) => ["trader", "processor"].includes(x.role))).id,
        price: b,
        quantityQuintals: rnd(100, 700),
        createdAt: daysAgo(i, 9),
      });
    }
  }
  // fix duplicate-ish auction codes by renumbering cleanly
  const pastAuc = await db.select().from(auctions).where(eq(auctions.status, "settled"));
  pastAuc.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  for (let i = 0; i < pastAuc.length; i++) {
    await db.update(auctions).set({ code: `AUC-${String(i + 1).padStart(4, "0")}` }).where(eq(auctions.id, pastAuc[i].id));
  }
  await db.update(auctions).set({ code: `AUC-${String(pastAuc.length + 1).padStart(4, "0")}` }).where(eq(auctions.id, liveAuction[0].id));

  /* ----------- live order book: seed resting orders around the ref --------- */
  const settingRows = await db.select().from(marketSettings);
  const nonState = us.filter((x) => ["trader", "farmer", "processor"].includes(x.role));
  for (const s of settingRows) {
    for (let i = 0; i < 16; i++) {
      const side: "buy" | "sell" = i % 2 === 0 ? "buy" : "sell";
      const off = rnd(1, 6);
      const price = side === "buy" ? Math.max(s.floorPrice + 1, s.referencePrice - off) : Math.min(s.ceilingPrice - 1, s.referencePrice + off);
      const actor = pick(nonState);
      const qty = rnd(10, 200);
      if (side === "buy" && actor.walletDzd < qty * 100 * price) continue;
      let receiptId: number | null = null;
      if (side === "sell" && Math.random() < 0.4) {
        const mine = await db.select().from(receipts).where(eq(receipts.holderId, actor.id)).limit(1);
        if (mine[0] && mine[0].status === "active") receiptId = mine[0].id;
      }
      await db.insert(orders).values({
        ref: ref("ORD"),
        userId: actor.id,
        side, orderType: "limit",
        grade: s.grade,
        quantityQuintals: qty,
        price,
        receiptId,
        wilayaId: actor.wilayaId,
        createdAt: new Date(Date.now() - rnd(0, 3600) * 1000),
        status: "open",
      });
    }
  }

  console.log("→ Activating market maker and matching…");
  await ensureMarketMakers();
  for (const g of ["A", "B", "C"] as const) await matchGrade(g);

  console.log("✓ Seed complete");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
