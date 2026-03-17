"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface TickerProps {
  filmCount: number;
  sessionCount: number;
  voseCount: number;
  cheapestSession: string;
  topFilm: string;
}

export function Ticker({ filmCount, sessionCount, voseCount, cheapestSession, topFilm }: TickerProps) {
  const { language, t } = useLanguage();
  const items = [
    { label: language === "es" ? "En cartel" : "Now showing", value: topFilm },
    { label: t("vose_sessions"), value: String(voseCount) },
    { label: t("films_today"), value: String(filmCount) },
    { label: t("sessions"), value: String(sessionCount) },
    { label: language === "es" ? "Sesión más barata" : "Cheapest session", value: cheapestSession },
    { label: t("direct_links"), value: t("direct_booking_flow") },
    { label: t("price_transparency"), value: t("visible_before_click") },
    { label: t("chains_covered"), value: "Cinesa · Yelmo · Kinepolis" }
  ];

  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((item, index) => (
          <span key={`${item.label}-${index}`} className="ticker-item">
            <span className="ticker-sep">◆</span>
            {item.label}: <strong>{item.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
