"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { roleColor } from "@/lib/format";

export interface Persona {
  id: number;
  email: string;
  nameAr: string;
  nameEn: string;
  orgAr: string | null;
  orgEn: string | null;
  role: string;
}

const ROLE_ICON: Record<string, string> = {
  farmer: "👨‍🌾",
  trader: "🏪",
  state: "🏛️",
  warehouse: "🧊",
  bank: "🏦",
  processor: "🏭",
  admin: "🛡️",
};

export function LoginView({ personas }: { personas: Persona[] }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doLogin(e?: string, p?: string) {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: (e ?? email).toLowerCase(), password: p ?? password }),
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setErr(t("login.failed"));
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 card p-6 h-fit">
        <div className="font-extrabold text-[#004624] text-lg mb-1">🔑 {t("login.title")}</div>
        <p className="text-xs text-slate-500 mb-5">{t("login.subtitle")}</p>
        <div className="space-y-3">
          <div>
            <label className="label">{t("login.email")}</label>
            <input className="input" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@platform.dz" />
          </div>
          <div>
            <label className="label">{t("login.password")}</label>
            <input
              type="password"
              className="input"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="algerie2026"
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
            />
          </div>
          {err && <div className="text-xs font-bold text-rose-700 bg-rose-50 rounded-lg p-2">{err}</div>}
          <button disabled={busy} onClick={() => doLogin()} className="btn-primary w-full">
            {busy ? "…" : t("login.submit")}
          </button>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-extrabold text-[#004624]">{t("login.personaTitle")}</h2>
          <span className="badge bg-slate-100 text-slate-600 ring-slate-300" dir="ltr">
            🔑 algerie2026 — {t("login.demoPassword")}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => doLogin(p.email, "algerie2026")}
              className="card p-4 text-start hover:ring-2 hover:ring-emerald-400 hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-emerald-50 grid place-items-center text-xl">
                  {ROLE_ICON[p.role] ?? "👤"}
                </span>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-[#004624] truncate">
                    {lang === "ar" ? p.nameAr : p.nameEn}
                  </div>
                  <span className={`badge ${roleColor(p.role)} mt-0.5`}>{t(`roles.${p.role}`)}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 truncate">
                {lang === "ar" ? p.orgAr : p.orgEn}
              </div>
              <div className="text-[10px] text-emerald-700 font-mono mt-1 opacity-0 group-hover:opacity-100 transition" dir="ltr">
                {p.email} →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
