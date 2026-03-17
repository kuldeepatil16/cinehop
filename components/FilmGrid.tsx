"use client";

import type { FilmCardData } from "@/lib/types";
import { FilmCard } from "@/components/FilmCard";
import { useLanguage } from "@/components/LanguageProvider";

interface FilmGridProps {
  films: FilmCardData[];
  onOpen: (film: FilmCardData) => void;
}

export function FilmGrid({ films, onOpen }: FilmGridProps) {
  const { t } = useLanguage();

  if (films.length === 0) {
    return (
      <div className="py-16 text-center text-muted">
        <div className="font-display text-5xl text-[color:var(--border)]">{t("no_films")}</div>
        <p>{t("adjust_filters")}</p>
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
