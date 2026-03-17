import Image from "next/image";

import type { FilmCardData } from "@/lib/types";

export function FilmCard({ film, onOpen }: { film: FilmCardData; onOpen: (film: FilmCardData) => void }) {
  const previewCinemas = film.showtimes.reduce<Array<{ cinema: string; sessions: typeof film.showtimes }>>((acc, showtime) => {
    const existing = acc.find((entry) => entry.cinema === showtime.cinema.name);
    if (existing) {
      existing.sessions.push(showtime);
    } else {
      acc.push({ cinema: showtime.cinema.name, sessions: [showtime] });
    }
    return acc;
  }, []);

  return (
    <button className="film-card" type="button" onClick={() => onOpen(film)}>
      <div className="film-card-inner">
        <div className="film-poster">
          {film.poster_url ? (
            <Image src={film.poster_url} alt={film.title} width={72} height={104} className="h-full w-full object-cover" />
          ) : (
            <div className="film-placeholder">{film.title.slice(0, 1)}</div>
          )}
        </div>
        <div className="film-info">
          <div className="film-badges">
            {film.formats.slice(0, 3).map((format) => (
              <span
                key={format}
                className={`badge ${format === "VOSE" ? "badge-vose" : format === "IMAX" ? "badge-imax" : format === "4DX" ? "badge-alt" : "badge-soft"}`}
              >
                {format}
              </span>
            ))}
          </div>
          <h3 className="film-title">{film.title}</h3>
          <div className="film-meta">
            <span>{film.genre?.join(" · ") || "Now showing"}</span>
            <span>·</span>
            <span>{film.runtime_min ? `${film.runtime_min} min` : "Runtime pending"}</span>
            <span>·</span>
            <span>{film.rating ? `★ ${film.rating.toFixed(1)}` : "IMDb pending"}</span>
          </div>
          {previewCinemas.slice(0, 2).map((entry) => (
            <div key={entry.cinema}>
              <div className="session-chain">{entry.cinema}</div>
              <div className="session-times">
                {entry.sessions.slice(0, 4).map((showtime) => (
                  <span key={showtime.id} className="time-pill">
                    {showtime.show_time}
                    {showtime.price_eur ? <span className="price-chip">€{showtime.price_eur.toFixed(2)}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
