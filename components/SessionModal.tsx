"use client";

import Image from "next/image";

import type { FilmCardData } from "@/lib/types";
import { ChainBadge } from "@/components/ChainBadge";
import { TimeButton } from "@/components/TimeButton";

interface SessionModalProps {
  film: FilmCardData | null;
  onClose: () => void;
}

export function SessionModal({ film, onClose }: SessionModalProps) {
  if (!film) {
    return null;
  }

  const grouped = film.showtimes.reduce<Record<string, typeof film.showtimes>>((acc, showtime) => {
    const key = `${showtime.cinema.chain}:${showtime.cinema.name}`;
    acc[key] = acc[key] ?? [];
    acc[key].push(showtime);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[color:var(--border)] p-7">
          <div className="flex gap-5">
            <div className="film-poster h-[130px] w-[90px]">
              {film.poster_url ? (
                <Image src={film.poster_url} alt={film.title} width={90} height={130} className="h-full w-full object-cover" />
              ) : (
                <div className="film-placeholder h-[130px] w-[90px]">{film.title.slice(0, 1)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="film-badges">
                {film.formats.map((format) => (
                  <span key={format} className={`badge ${format === "VOSE" ? "badge-vose" : "badge-soft"}`}>
                    {format}
                  </span>
                ))}
              </div>
              <h2 className="film-title text-[2.2rem]">{film.title}</h2>
              <div className="film-meta">
                <span>{film.genre?.join(" · ") || "Now showing"}</span>
                <span>·</span>
                <span>{film.runtime_min ? `${film.runtime_min} min` : "Runtime pending"}</span>
                <span>·</span>
                <span>{film.rating ? `★ ${film.rating.toFixed(1)}` : "IMDb pending"}</span>
              </div>
              <p className="text-sm leading-6 text-muted">{film.synopsis ?? "Synopsis not yet available."}</p>
            </div>
            <button type="button" className="text-2xl text-muted" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="p-7">
          {Object.entries(grouped).map(([key, showtimes]) => (
            <div key={key} className="mb-6 last:mb-0">
              <div className="mb-3 flex items-center gap-3">
                <ChainBadge chain={showtimes[0].cinema.chain} />
                <div>
                  <div className="font-display text-xl">{showtimes[0].cinema.name}</div>
                  <div className="text-sm text-muted">{showtimes[0].cinema.address}</div>
                </div>
              </div>
              <div className="session-times">
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
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
