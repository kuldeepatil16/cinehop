import { SITE_URL } from "@/lib/constants";
import type {
  Chain,
  FilmCardData,
  FilmDetailChainGroup,
  FilmDetailData,
  FilmDetailDateGroup,
  FilmWithShowtimes,
  ShowtimeWithCinema,
  TrackPayload
} from "@/lib/types";

export function formatSpanishDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function resolveQueryDate(input?: string | null): string {
  const today = new Date();

  if (!input || input === "today") {
    return today.toISOString().slice(0, 10);
  }

  if (input === "tomorrow") {
    const next = new Date(today);
    next.setDate(today.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }

  return input;
}

export function toCanonicalUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}

export function buildFilmCardData(film: FilmWithShowtimes): FilmCardData {
  const formats = [...new Set(film.showtimes.map((showtime) => showtime.format))];
  const chains = [...new Set(film.showtimes.map((showtime) => showtime.cinema.chain))] as Chain[];
  const prices = film.showtimes.map((showtime) => showtime.price_eur).filter((value): value is number => value !== null);

  return {
    ...film,
    formats,
    chains,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    totalSessions: film.showtimes.length
  };
}

export function groupFilmDetail(film: FilmWithShowtimes): FilmDetailData {
  const byDate = new Map<string, ShowtimeWithCinema[]>();

  for (const showtime of film.showtimes) {
    const current = byDate.get(showtime.show_date) ?? [];
    current.push(showtime);
    byDate.set(showtime.show_date, current);
  }

  const upcoming_sessions: FilmDetailDateGroup[] = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, showtimes]) => {
      const chainMap = new Map<Chain, ShowtimeWithCinema[]>();

      for (const showtime of showtimes) {
        const current = chainMap.get(showtime.cinema.chain) ?? [];
        current.push(showtime);
        chainMap.set(showtime.cinema.chain, current);
      }

      const chains: FilmDetailChainGroup[] = [...chainMap.entries()].map(([chain, chainShowtimes]) => {
        const cinemaMap = new Map<string, ShowtimeWithCinema[]>();

        for (const showtime of chainShowtimes) {
          const current = cinemaMap.get(showtime.cinema.id) ?? [];
          current.push(showtime);
          cinemaMap.set(showtime.cinema.id, current);
        }

        return {
          chain,
          cinemas: [...cinemaMap.values()].map((cinemaShowtimes) => ({
            cinema: cinemaShowtimes[0].cinema,
            showtimes: cinemaShowtimes
              .map(({ cinema, ...showtime }) => showtime)
              .sort((left, right) => left.show_time.localeCompare(right.show_time))
          }))
        };
      });

      return {
        date,
        chains
      };
    });

  return {
    ...film,
    upcoming_sessions,
    total_sessions: film.showtimes.length
  };
}

export function buildTrackingPayload(
  showtimeId: string,
  cinemaChain: Chain,
  filmSlug: string,
  sessionFormat: string
): TrackPayload {
  return {
    showtime_id: showtimeId,
    cinema_chain: cinemaChain,
    film_slug: filmSlug,
    session_format: sessionFormat as TrackPayload["session_format"]
  };
}
