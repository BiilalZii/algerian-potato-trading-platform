import type { Lang } from "./i18n";

export function fmtInt(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-US");
}

export function fmtDzd(n: number | bigint | null | undefined, lang: Lang = "ar"): string {
  const v = fmtInt(n);
  return lang === "ar" ? `${v} دج` : `${v} DZD`;
}

export function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

export function fmtQty(q: number, lang: Lang = "ar"): string {
  return lang === "ar" ? `${fmtInt(q)} قنطار` : `${fmtInt(q)} q`;
}

export function fmtTons(qQuintals: number, lang: Lang = "ar"): string {
  const tons = qQuintals / 10;
  const v = tons >= 100 ? Math.round(tons) : Math.round(tons * 10) / 10;
  return lang === "ar" ? `${fmtInt(v)} طن` : `${fmtInt(v)} t`;
}

export function localName(
  ar: string | null | undefined,
  en: string | null | undefined,
  lang: Lang,
): string {
  if (lang === "ar") return ar ?? en ?? "—";
  return en ?? ar ?? "—";
}

export function gradeLabel(g: "A" | "B" | "C", lang: Lang): string {
  const map = {
    ar: { A: "الدرجة أ — ممتازة", B: "الدرجة ب — معيارية", C: "الدرجة ج — صناعية" },
    en: { A: "Grade A — Premium", B: "Grade B — Standard", C: "Grade C — Industrial" },
  } as const;
  return map[lang][g];
}

export function gradeShort(g: "A" | "B" | "C"): string {
  return g;
}

export function gradeColor(g: "A" | "B" | "C"): string {
  return g === "A"
    ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
    : g === "B"
      ? "bg-amber-100 text-amber-800 ring-amber-300"
      : "bg-stone-200 text-stone-800 ring-stone-400";
}

export function roleColor(role: string): string {
  const map: Record<string, string> = {
    farmer: "bg-green-100 text-green-800 ring-green-300",
    trader: "bg-sky-100 text-sky-800 ring-sky-300",
    state: "bg-red-100 text-red-800 ring-red-300",
    warehouse: "bg-indigo-100 text-indigo-800 ring-indigo-300",
    bank: "bg-purple-100 text-purple-800 ring-purple-300",
    processor: "bg-orange-100 text-orange-800 ring-orange-300",
    admin: "bg-slate-200 text-slate-800 ring-slate-400",
  };
  return map[role] ?? "bg-slate-100 text-slate-700 ring-slate-300";
}

export function fmtDate(d: Date | string | null, lang: Lang = "ar"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(lang === "ar" ? "ar-DZ" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(d: Date | string | null, lang: Lang = "ar"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(lang === "ar" ? "ar-DZ" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(d: Date | string, lang: Lang = "ar"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (lang === "ar") {
    if (sec < 60) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  }
  if (sec < 60) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function tradeValueDzd(quintals: number, pricePerKg: number): number {
  return quintals * 100 * pricePerKg;
}
