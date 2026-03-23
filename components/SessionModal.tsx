"use client";

import Image from "next/image";

import { ChainBadge } from "@/components/ChainBadge";
import { TimeButton } from "@/components/TimeButton";
import { useLanguage } from "@/components/LanguageProvider";
import { buildPosterSrc } from "@/lib/posters";
import type { FilmCardData } from "@/lib/types";

interface SessionModalProps {
  film: FilmCardData | null;
}

export function SessionModal({ film }: SessionModalProps) {
  const { t } = useLanguage();

  if (!film) {
    return null;
  }

  const grouped = film.showtimes.reduce<Map<string, { cinema: FilmCardData["showtimes"][number]["cinema"]; showtimes: FilmCardData["showtimes"] }>>(
    (acc, showtime) => {
      const key = `${showtime.cinema.chain}:${showtime.cinema.name}`;
      const current = acc.get(key);

      if (current) {
        current.showtimes.push(showtime);
        return acc;
      }

      acc.set(key, { cinema: showtime.cinema, showtimes: [showtime] });
      return acc;
    },
    new Map()
  );

  const cinemaGroups = [...grouped.values()]
    .map((group) => ({
      cinema: group.cinema,
      showtimes: [...group.showtimes].sort((left, right) => left.show_time.localeCompare(right.show_time))
    }))
    .sort((left, right) => left.showtimes[0].show_time.localeCompare(right.showtimes[0].show_time));
  const posterSrc = buildPosterSrc(film.poster_url);

  return (
    <section className="session-board" aria-label={`${t("showtimes_for")} ${film.title}`}>
      <div className="session-board-head">
        <div className="session-board-poster">
          {posterSrc ? (
            <Image src={posterSrc} alt={film.title} fill sizes="180px" className="object-cover" />
          ) : (
            <div className="film-placeholder">{film.title.slice(0, 1)}</div>
          )}
        </div>

        <div className="session-board-copy">
          <div className="section-kicker">{t("showtimes_for")}</div>
          <h2 className="session-board-title">{film.title}</h2>
          <div className="session-board-meta">
            <span>{film.genre?.join(" / ") || "Now showing"}</span>
            <span>{film.runtime_min ? `${film.runtime_min} min` : "Runtime pending"}</span>
            <span>{film.rating ? `IMDb ${film.rating.toFixed(1)}` : "IMDb pending"}</span>
            <span>{film.minPrice !== null ? `From EUR${film.minPrice.toFixed(2)}` : `${film.totalSessions} sessions`}</span>
          </div>
          <div className="film-badges">
            {film.formats.map((format) => (
              <span key={format} className={`badge ${format === "VOSE" || format === "VOSI" ? "badge-vose" : format === "IMAX" ? "badge-imax" : format === "4DX" ? "badge-alt" : "badge-soft"}`}>
                {format}
              </span>
            ))}
          </div>
          <p className="session-board-note">{t("booking_board_copy")}</p>
        </div>
      </div>

      <div className="session-board-toolbar">
        <span className="session-board-toolbar-item">{t("direct_booking_live")}</span>
        <span className="session-board-toolbar-item">{t("formats_on_buttons")}</span>
      </div>

      <div className="session-board-list">
        {cinemaGroups.map(({ cinema, showtimes }) => (
          <article key={`${cinema.chain}:${cinema.id}`} className="cinema-row">
            <div className="cinema-row-head">
              <div className="cinema-row-brand">
                <ChainBadge chain={cinema.chain} />
                <div>
                  <h3 className="cinema-row-title">{cinema.name}</h3>
                  <p className="cinema-row-copy">{cinema.address}</p>
                </div>
              </div>
              <div className="cinema-row-summary">
                <span>{showtimes.length} {t("session_count_label")}</span>
                <span>{showtimes[0].show_time} onwards</span>
              </div>
            </div>

            <div className="session-times session-times--booking">
              {showtimes.map((showtime) => (
                <TimeButton
                  key={showtime.id}
                  href={showtime.booking_url}
                  label={showtime.show_time}
                  price={showtime.price_eur}
                  showtimeId={showtime.id}
                  chain={showtime.cinema.chain}
                  filmSlug={film.slug}
                  format={showtime.format}
                  showFormat
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
