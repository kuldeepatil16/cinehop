"use client";

import { FilmCard } from "@/components/FilmCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { FilmCardData } from "@/lib/types";

interface FilmGridProps {
  films: FilmCardData[];
  onOpen: (film: FilmCardData) => void;
  selectedFilmId?: string | null;
  hasActiveFilters?: boolean;
}

export function FilmGrid({ films, onOpen, selectedFilmId, hasActiveFilters }: FilmGridProps) {
  const { t } = useLanguage();

  if (films.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("no_films")}</div>
        <p className="empty-state-hint">
          {hasActiveFilters
            ? t("adjust_filters")
            : "No live sessions found for this city and date yet. CineHop only shows recently scraped sessions for today and the next few days."}
        </p>
      </div>
    );
  }

  return (
    <div className="films-grid">
      {films.map((film) => (
        <FilmCard key={film.id} film={film} onOpen={onOpen} isActive={film.id === selectedFilmId} />
      ))}
    </div>
  );
}
