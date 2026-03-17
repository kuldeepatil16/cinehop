"use client";

import Link from "next/link";

import { formatSpanishDate } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

export function SiteHeader() {
  const today = formatSpanishDate(new Date().toISOString());
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      <nav className="cine-nav">
        <Link href="/" className="cine-logo">
          CineHop<span className="logo-dot" />
        </Link>
        <ul className="cine-nav-links">
          <li>
            <Link href="/">{t("nav_films")}</Link>
          </li>
          <li>
            <a href="#ad-slot-top">{t("nav_top")}</a>
          </li>
          <li>
            <Link href="/privacidad">{t("nav_privacy")}</Link>
          </li>
          <li>
            <a href="https://github.com" rel="noreferrer" target="_blank">
              {t("nav_oss")}
            </a>
          </li>
        </ul>
        <button
          type="button"
          className="pill active"
          onClick={() => setLanguage(language === "es" ? "en" : "es")}
        >
          {language === "es" ? "ES / EN" : "EN / ES"}
        </button>
      </nav>
      <div className="today-strip">
        <span>{today}</span>
        <span className="live-dot">{t("live_strip")}</span>
      </div>
    </>
  );
}
