"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { gradeColor, roleColor } from "@/lib/format";

export interface UserDto {
  id: number;
  nameAr: string;
  nameEn: string;
  orgAr: string | null;
  orgEn: string | null;
  role: string;
  email: string;
  walletDzd: number;
  wilayaAr?: string | null;
  wilayaEn?: string | null;
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#006233" />
      <circle cx="24" cy="24" r="23" fill="none" stroke="#fff" strokeOpacity="0.25" />
      {/* exchange arrows */}
      <path d="M14 19h17l-4.5-4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 29H17l4.5 4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="19" r="2.4" fill="#D21034" />
      <circle cx="34" cy="29" r="2.4" fill="#D21034" />
    </svg>
  );
}

export function PotatoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3c1.4 1.6 1.2 3 .3 4.3 2-.5 4.4 0 5.6 1.8 1.2 1.8.7 4.3-.9 5.6.9 1.5.4 3.6-1.4 4.3-1.4.6-3 .2-4.1-.9-1.3 1-3.2 1.2-4.6.2-1.6-1.2-1.6-3.3-.6-4.6-1.4-.9-2-3-1-4.6 1-1.5 2.8-1.6 4.3-1.1C8.8 6.6 9.6 4.4 12 3Z" />
    </svg>
  );
}

const NAV = [
  { href: "/", key: "nav.market" },
  { href: "/trading", key: "nav.trading" },
  { href: "/auctions", key: "nav.auctions" },
  { href: "/receipts", key: "nav.receipts" },
  { href: "/stores", key: "nav.stores" },
  { href: "/intervention", key: "nav.intervention" },
  { href: "/trace", key: "nav.trace" },
];

export function Header({ user }: { user: UserDto | null }) {
  const { t, lang, toggle } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[#004624] text-white/85 pattern-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-[11px]">
          <span className="font-semibold truncate">{t("app.authority")}</span>
          <span className="hidden md:inline" dir="ltr">
            🇩🇿 People&apos;s Democratic Republic of Algeria
          </span>
        </div>
      </div>
      <div className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Logo />
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold text-[#004624]">{t("app.name")}</div>
              <div className="text-[10.5px] font-semibold text-slate-400 tracking-wide" dir={lang === "ar" ? "rtl" : "ltr"}>
                {lang === "ar" ? "National Potato Exchange — DZ" : "البورصة الوطنية للبطاطا — الجزائر"}
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 mx-auto">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
                    active
                      ? "bg-emerald-50 text-[#006233]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#006233]"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ms-auto lg:ms-0">
            <button onClick={toggle} className="btn-ghost px-3 py-2 text-xs font-bold" dir="ltr">
              🌐 {lang === "ar" ? "EN" : "ع"}
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="hidden md:flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-1.5">
                  <span className={`badge ${roleColor(user.role)}`}>{t(`roles.${user.role}`)}</span>
                  <span className="text-xs font-bold text-slate-700 max-w-[120px] truncate">
                    {lang === "ar" ? user.nameAr : user.nameEn}
                  </span>
                </Link>
                <button onClick={logout} className="btn-outline px-3 py-2 text-xs">
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary px-4 py-2 text-xs">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
        <nav className="lg:hidden border-t border-slate-100 overflow-x-auto">
          <div className="flex gap-1 px-3 py-1.5 w-max">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
                    active ? "bg-emerald-50 text-[#006233]" : "text-slate-600 bg-slate-50"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 bg-[#004624] text-white/80 pattern-bg">
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-6 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <Logo size={44} />
          <div>
            <div className="text-white font-extrabold">{t("app.name")}</div>
            <div className="text-xs mt-1 leading-relaxed">{t("app.tagline")}</div>
          </div>
        </div>
        <div className="text-xs leading-relaxed">{t("footer.line1")}</div>
        <div className="text-xs leading-relaxed">
          <div>{t("footer.line2")}</div>
          <div className="mt-3 text-white/60">{t("footer.rights")}</div>
        </div>
      </div>
    </footer>
  );
}

export function GradeBadge({ grade, label }: { grade: "A" | "B" | "C"; label?: string }) {
  return <span className={`badge ${gradeColor(grade)}`}>{label ?? `Grade ${grade} · ${grade}`}</span>;
}

export function StatusPill({
  status,
  tone = "slate",
}: {
  status: string;
  tone?: "slate" | "green" | "red" | "amber" | "blue";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-300",
    green: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    red: "bg-rose-100 text-rose-800 ring-rose-300",
    amber: "bg-amber-100 text-amber-800 ring-amber-300",
    blue: "bg-sky-100 text-sky-800 ring-sky-300",
  };
  return <span className={`badge ${tones[tone]}`}>{status}</span>;
}

export function PageHead({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-black text-[#004624] flex items-center gap-2.5">
        {icon && <span>{icon}</span>}
        {title}
      </h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-3xl leading-relaxed">{subtitle}</p>}
    </div>
  );
}
