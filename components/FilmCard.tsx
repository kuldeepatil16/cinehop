import Image from "next/image";

import { buildPosterSrc } from "@/lib/posters";
import type { FilmCardData } from "@/lib/types";

interface FilmCardProps {
  film: FilmCardData;
  onOpen: (film: FilmCardData) => void;
  isActive?: boolean;
}

export function FilmCard({ film, onOpen, isActive = false }: FilmCardProps) {
  const previewShowtimes = film.showtimes.slice(0, 4);
  const remainingSessions = Math.max(0, film.totalSessions - previewShowtimes.length);
  const genreLabel = film.genre?.slice(0, 3).join(" / ") || "Now showing";
  const ratingLabel = film.rating ? `${film.rating.toFixed(1)}/10 IMDb` : "Rating pending";
  const sessionLabel = `${film.totalSessions} ${film.totalSessions === 1 ? "session" : "sessions"}`;
  const posterSrc = buildPosterSrc(film.poster_url);

  return (
    <button
      className={`film-card ${isActive ? "is-active" : ""}`}
      type="button"
      aria-pressed={isActive}
      onClick={() => onOpen(film)}
    >
      <div className="film-card-inner">
        <div className="film-poster">
          {posterSrc ? (
            <Image src={posterSrc} alt={film.title} fill sizes="(max-width: 768px) 42vw, (max-width: 1200px) 24vw, 18vw" className="object-cover" />
          ) : (
            <div className="film-placeholder">{film.title.slice(0, 1)}</div>
          )}

          <div className="film-badges film-badges--overlay">
            {film.formats.slice(0, 3).map((format) => (
              <span
                key={format}
                className={`badge ${format === "VOSE" || format === "VOSI" ? "badge-vose" : format === "IMAX" ? "badge-imax" : format === "4DX" ? "badge-alt" : "badge-soft"}`}
              >
                {format}
              </span>
            ))}
          </div>

          <div className="poster-rating">
            <span className="poster-rating-value">{ratingLabel}</span>
            <span className="poster-rating-copy">{sessionLabel}</span>
          </div>
        </div>

        <div className="film-info">
          <h3 className="film-title">{film.title}</h3>
          <div className="film-meta">
            <span>{genreLabel}</span>
            <span>{film.runtime_min ? `${film.runtime_min} min` : "Runtime pending"}</span>
            <span>{film.minPrice !== null ? `From EUR${film.minPrice.toFixed(2)}` : sessionLabel}</span>
          </div>

          <div className="session-times session-times--preview">
            {previewShowtimes.map((showtime) => (
              <span key={showtime.id} className="time-pill time-pill--preview">
                {showtime.show_time}
              </span>
            ))}
            {remainingSessions > 0 ? (
              <span className="time-pill time-pill--preview time-pill--ghost">+{remainingSessions}</span>
            ) : null}
          </div>

          <div className="film-card-cta">Compare cinemas and showtimes</div>
        </div>
      </div>
    </button>
  );
}
