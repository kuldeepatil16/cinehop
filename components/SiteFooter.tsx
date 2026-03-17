"use client";

import Link from "next/link";

import { FOOTER_COPY } from "@/lib/constants";
import { ChainBadge } from "@/components/ChainBadge";
import { useLanguage } from "@/components/LanguageProvider";

export function SiteFooter() {
  const { language } = useLanguage();
  const copy =
    language === "es"
      ? "CineHop Madrid · Datos actualizados cada 2h · No afiliado a ninguna cadena"
      : FOOTER_COPY;

  return (
    <footer className="footer-shell">
      <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">{copy}</div>
      <div className="flex flex-wrap items-center gap-3">
        <ChainBadge chain="cinesa" />
        <ChainBadge chain="yelmo" />
        <ChainBadge chain="kinepolis" />
        <Link href="/privacidad" className="pill">
          {language === "es" ? "Privacidad" : "Privacy"}
        </Link>
      </div>
    </footer>
  );
}
