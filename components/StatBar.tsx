"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface StatBarProps {
  filmCount: number;
  sessionCount: number;
  voseCount: number;
}

export function StatBar({ filmCount, sessionCount, voseCount }: StatBarProps) {
  const { t } = useLanguage();

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-num">{filmCount}</span>
        <span className="stat-label">{t("films_today")}</span>
      </div>
      <div className="stat">
        <span className="stat-num">{sessionCount}</span>
        <span className="stat-label">{t("sessions")}</span>
      </div>
      <div className="stat">
        <span className="stat-num">{voseCount}</span>
        <span className="stat-label">{t("vose_sessions")}</span>
      </div>
      <div className="stat">
        <span className="stat-num">3</span>
        <span className="stat-label">{t("chains_covered")}</span>
      </div>
    </div>
  );
}
