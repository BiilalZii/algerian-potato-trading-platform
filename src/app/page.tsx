import { cookies } from "next/headers";
import AppShell from "@/components/shell";
import { makeT, type Lang } from "@/lib/dict";
import { getSettings, getSeries, getTodayBars } from "@/lib/queries";
import { Hero, MacroStats, MarketSection, Components, Roadmap, type SettingDto } from "@/components/home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  const lang: Lang = jar.get("hcn_lang")?.value === "en" ? "en" : "ar";
  const t = makeT(lang);
  void t;

  const settingsRows = await getSettings();
  const today = await getTodayBars();
  const series: Record<string, Awaited<ReturnType<typeof getSeries>>> = {};
  const dtos: SettingDto[] = [];

  for (const s of settingsRows) {
    const data = await getSeries(s.grade, 120);
    series[s.grade] = data;
    const prev = data.length >= 2 ? data[data.length - 2].close : null;
    const bar = today.find((b) => b.grade === s.grade);
    dtos.push({
      grade: s.grade,
      referencePrice: s.referencePrice,
      floorPrice: s.floorPrice,
      ceilingPrice: s.ceilingPrice,
      marketMakerEnabled: s.marketMakerEnabled,
      stateStockQuintals: s.stateStockQuintals,
      prevClose: prev,
      todayVolume: bar?.volumeQuintals ?? 0,
    });
  }

  const totalStock = settingsRows.reduce((a, s) => a + s.stateStockQuintals, 0);

  return (
    <AppShell>
      <Hero settings={dtos} />
      <MacroStats stockQuintals={totalStock} />
      <MarketSection settings={dtos} series={series} />
      <Components />
      <Roadmap />
    </AppShell>
  );
}
