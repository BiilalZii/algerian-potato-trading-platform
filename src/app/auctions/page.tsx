import { cookies } from "next/headers";
import AppShell from "@/components/shell";
import { PageHead } from "@/components/site";
import { makeT, type Lang } from "@/lib/dict";
import { getCurrentUser } from "@/lib/auth";
import { getLiveAuction, getPastAuctions } from "@/lib/queries";
import { AuctionsView, type LiveAuctionDto, type PastAuctionDto } from "@/components/auctions";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  const user = await getCurrentUser();

  const live = await getLiveAuction();
  const pastRows = await getPastAuctions(12);

  let liveDto: LiveAuctionDto | null = null;
  if (live) {
    liveDto = {
      id: live.auction.id,
      code: live.auction.code,
      grade: live.auction.grade,
      quantityQuintals: live.auction.quantityQuintals,
      scheduledAt: live.auction.scheduledAt.toISOString(),
      noteAr: live.auction.noteAr,
      noteEn: live.auction.noteEn,
      sellerAr: live.seller?.nameAr ?? "—",
      sellerEn: live.seller?.nameEn ?? "—",
      bids: live.bids.map((b) => ({
        id: b.id,
        price: b.price,
        quantityQuintals: b.quantityQuintals,
        createdAt: b.createdAt.toISOString(),
        userNameAr: b.user.nameAr,
        userNameEn: b.user.nameEn,
        userRole: b.user.role,
        mine: user?.id === b.userId,
      })),
    };
  }

  const past: PastAuctionDto[] = pastRows.map((r) => ({
    id: r.a.id,
    code: r.a.code,
    grade: r.a.grade,
    quantityQuintals: r.a.quantityQuintals,
    scheduledAt: r.a.scheduledAt.toISOString(),
    settlePrice: r.a.settlePrice,
    sellerAr: r.seller?.nameAr ?? null,
    sellerEn: r.seller?.nameEn ?? null,
    winnerAr: r.winner?.nameAr ?? null,
    winnerEn: r.winner?.nameEn ?? null,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHead icon="🔨" title={t("auctions.title")} subtitle={t("auctions.subtitle")} />
        <AuctionsView
          live={liveDto}
          past={past}
          loggedIn={!!user}
          isState={user?.role === "state" || user?.role === "admin"}
        />
      </div>
    </AppShell>
  );
}
