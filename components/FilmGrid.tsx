"use client";

import type { FilmCardData } from "@/lib/types";
import { FilmCard } from "@/components/FilmCard";
import { useLanguage } from "@/components/LanguageProvider";

interface FilmGridProps {
  films: FilmCardData[];
  onOpen: (film: FilmCardData) => void;
  hasActiveFilters?: boolean;
}

export function FilmGrid({ films, onOpen, hasActiveFilters }: FilmGridProps) {
  const { t } = useLanguage();

  if (films.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("no_films")}</div>
        <p className="empty-state-hint">
          {hasActiveFilters
            ? t("adjust_filters")
            : "No sessions scraped for this city / date yet. Data refreshes every 3h — check back soon or trigger a scrape from GitHub Actions."}
        </p>
      </div>
    );
  }

  return (
    <div className="films-grid">
      {films.map((film) => (
        <FilmCard key={film.id} film={film} onOpen={onOpen} />
      ))}
    </div>
  );
}
