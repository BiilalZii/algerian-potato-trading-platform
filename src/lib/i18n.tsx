"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { dict, makeT, type Lang, type TFunc } from "./dict";

interface I18nCtx {
  lang: Lang;
  t: TFunc;
  setLang: (l: Lang) => void;
  toggle: () => void;
  dir: "rtl" | "ltr";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.cookie = `hcn_lang=${lang};path=/;max-age=31536000`;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((l) => (l === "ar" ? "en" : "ar"));
  const t = makeT(lang);

  return (
    <Ctx.Provider value={{ lang, t, setLang, toggle, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { dict };
export type { Lang };
