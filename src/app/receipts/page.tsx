import { cookies } from "next/headers";
import AppShell from "@/components/shell";
import { PageHead } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getCurrentUser } from "@/lib/auth";
import { getReceipts, getFarmers, getBanks, getStores } from "@/lib/queries";
import { ReceiptsView, type ReceiptDto, type OptionDto } from "@/components/receipts";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const user = await getCurrentUser();

  const [rows, farmers, banks, stores] = await Promise.all([
    getReceipts(),
    getFarmers(),
    getBanks(),
    getStores(),
  ]);

  // warehouse operators can only issue into their own stores
  const allowedStores =
    user?.role === "warehouse"
      ? stores.filter((s) => s.s.operatorId === user.id)
      : stores;

  const receiptDtos: ReceiptDto[] = rows.map((r) => ({
    id: r.receipt.id,
    code: r.receipt.code,
    grade: r.receipt.grade,
    total: r.receipt.totalQuantityQuintals,
    available: r.receipt.availableQuantityQuintals,
    status: r.receipt.status,
    pledgeAmount: r.receipt.pledgeAmountDzd != null ? Number(r.receipt.pledgeAmountDzd) : null,
    issueDate: r.receipt.issueDate.toISOString(),
    lotCode: r.lot.code,
    variety: r.lot.variety,
    quality: r.lot.qualityScore,
    storeAr: r.store.nameAr,
    storeEn: r.store.nameEn,
    holderId: r.holder.id,
    holderAr: r.holder.nameAr,
    holderEn: r.holder.nameEn,
    holderRole: r.holder.role,
    bankAr: r.bank?.nameAr ?? null,
    bankEn: r.bank?.nameEn ?? null,
    farmerAr: r.farmer.nameAr,
    farmerEn: r.farmer.nameEn,
    wilayaAr: r.wilaya.nameAr,
    wilayaEn: r.wilaya.nameEn,
  }));

  const { db } = await import("@/db");
  const { wilayas } = await import("@/db/schema");
  const wRows = await db.select().from(wilayas);
  const wmap = new Map(wRows.map((x) => [x.id, x]));
  const farmerOptions: OptionDto[] = farmers.map((f) => ({
    id: f.id,
    labelAr: f.nameAr,
    labelEn: f.nameEn,
    wilayaAr: f.wilayaId ? wmap.get(f.wilayaId)?.nameAr : undefined,
    wilayaEn: f.wilayaId ? wmap.get(f.wilayaId)?.nameEn : undefined,
  }));
  const storeRows = await Promise.resolve(allowedStores);
  void storeRows;
  const storeOptions: OptionDto[] = allowedStores.map((s) => ({
    id: s.s.id,
    labelAr: s.s.nameAr,
    labelEn: s.s.nameEn,
    wilayaAr: s.w.nameAr,
    wilayaEn: s.w.nameEn,
    capacity: s.s.capacityQuintals,
    used: s.s.usedQuintals,
  }));
  const bankOptions: OptionDto[] = banks.map((b) => ({
    id: b.id,
    labelAr: b.nameAr,
    labelEn: b.nameEn,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHead icon="🧾" title={t("receipts.title")} subtitle={t("receipts.subtitle")} />
        <ReceiptsView
          receipts={receiptDtos}
          farmers={farmerOptions}
          stores={storeOptions}
          banks={bankOptions}
          user={user ? { id: user.id, role: user.role } : null}
        />
      </div>
    </AppShell>
  );
}
