import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider, type Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "البورصة الوطنية للبطاطا — National Potato Exchange",
  description:
    "منصة التداول الإلكترونية للبطاطا في السوق الجزائري — Electronic Potato Trading Platform for the Algerian Market",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const lang = (jar.get("hcn_lang")?.value === "en" ? "en" : "ar") as Lang;

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-screen antialiased">
        <I18nProvider initialLang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
