import { DEFAULT_CACHE_CONTROL, MADRID_TIMEZONE, SCRAPE_CONFIG } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase";
import type {
  Cinema,
  Film,
  FilmApiResponse,
  FilmsApiParams,
  FilmsApiResponse,
  FilmWithShowtimes,
  Showtime
} from "@/lib/types";
import {
  buildFilmCardData,
  getDateInTimezone,
  groupFilmDetail,
  isDateWithinWindow,
  resolveQueryDate
} from "@/lib/utils";

type JoinedShowtimeRow = Showtime & {
  films: Film | Film[] | null;
  cinemas: Cinema | Cinema[] | null;
};

function asArray<T>(value?: T | T[] | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normaliseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function toFilmMap(rows: JoinedShowtimeRow[]): FilmWithShowtimes[] {
  const filmMap = new Map<string, FilmWithShowtimes>();

  for (const row of rows) {
    const film = Array.isArray(row.films) ? row.films[0] : row.films;
    const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;

    if (!film || !cinema) continue;

    const current = filmMap.get(film.id) ?? { ...film, showtimes: [] };
    current.showtimes.push({ ...row, cinema });
    filmMap.set(film.id, current);
  }

  return [...filmMap.values()];
}

/**
 * Builds the base Supabase showtime query for a given date.
 * City, chain and zone are pushed to the DB via embedded-resource filters
 * so we don't fetch the whole table and filter in JS.
 */
function buildShowtimesQuery(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  date: string,
  params: Pick<FilmsApiParams, "city" | "chain" | "zone" | "vose" | "format" | "language"> = {}
) {
  let query = supabase
    .from("showtimes")
    .select(
      "id, film_id, cinema_id, show_date, show_time, format, language, is_vose, price_eur, booking_url, source_hash, last_seen_at, created_at, films!inner(*), cinemas!inner(*)"
    )
    .eq("show_date", date)
    .order("show_time", { ascending: true });

  if (params.city) query = query.eq("cinemas.city", params.city);
  if (!Array.isArray(params.chain) && params.chain) query = query.eq("cinemas.chain", params.chain);
  if (params.zone) query = query.eq("cinemas.zone", params.zone);
  if (params.vose === "true") query = query.eq("is_vose", true);
  if (!Array.isArray(params.format) && params.format) query = query.eq("format", params.format);
  if (!Array.isArray(params.language) && params.language) query = query.eq("language", params.language);

  return query;
}

export async function getFilmsForDate(params: FilmsApiParams = {}): Promise<FilmsApiResponse> {
  const supabase = createServerSupabaseClient();
  let date = resolveQueryDate(params.date);

  const { data, error } = await buildShowtimesQuery(supabase, date, params);

  if (error) {
    throw new Error(`Unable to fetch films: ${error.message}`);
  }

  let rows = (data ?? []) as unknown as JoinedShowtimeRow[];

  // Fallback only within the active 2-4 day booking window. Never jump back
  // to historical data just to avoid an empty state.
  if (
    rows.length === 0 &&
    (!params.date || params.date === "today" || params.date === "tomorrow" || isDateWithinWindow(date))
  ) {
    const windowStart = getDateInTimezone(new Date(), MADRID_TIMEZONE);
    const windowEnd = getDateInTimezone(
      new Date(Date.now() + (SCRAPE_CONFIG.days - 1) * 24 * 60 * 60 * 1000),
      MADRID_TIMEZONE
    );

    let fallbackQuery = supabase
      .from("showtimes")
      .select("show_date, cinemas!inner(city)")
      .gte("show_date", windowStart)
      .lte("show_date", windowEnd)
      .order("show_date", { ascending: true })
      .limit(1);

    if (params.city) {
      fallbackQuery = fallbackQuery.eq("cinemas.city", params.city);
    }

    const { data: fallbackTarget } = await fallbackQuery.maybeSingle();

    if (fallbackTarget?.show_date && isDateWithinWindow(fallbackTarget.show_date as string)) {
      date = fallbackTarget.show_date as string;
      const { data: fallbackData, error: fallbackError } = await buildShowtimesQuery(
        supabase,
        date,
        params
      );
      if (!fallbackError) {
        rows = (fallbackData ?? []) as unknown as JoinedShowtimeRow[];
      }
    }
  }

  if (params.vose === "true") {
    rows = rows.filter((row) => row.is_vose);
  }

  const formats = asArray(params.format);
  if (formats.length > 0) {
    rows = rows.filter((row) => formats.includes(row.format));
  }

  const chains = asArray(params.chain);
  if (chains.length > 0) {
    rows = rows.filter((row) => {
      const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;
      return cinema ? chains.includes(cinema.chain) : false;
    });
  }

  const languages = asArray(params.language);
  if (languages.length > 0) {
    rows = rows.filter((row) => row.language !== null && languages.includes(row.language));
  }

  if (params.price_max) {
    const priceMax = Number.parseFloat(params.price_max);
    if (Number.isFinite(priceMax)) {
      rows = rows.filter((row) => row.price_eur === null || row.price_eur <= priceMax);
    }
  }

  if (params.q) {
    const queryText = normaliseText(params.q.trim());
    rows = rows.filter((row) => {
      const film = Array.isArray(row.films) ? row.films[0] : row.films;
      const filmTitle = normaliseText(`${film?.title ?? ""} ${film?.title_es ?? ""}`);
      const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;
      const cinemaName = normaliseText(cinema?.name ?? "");
      return filmTitle.includes(queryText) || cinemaName.includes(queryText);
    });
  }

  const films = toFilmMap(rows)
    .map(buildFilmCardData)
    .sort((left, right) => {
      if (right.totalSessions !== left.totalSessions) {
        return right.totalSessions - left.totalSessions;
      }
      return left.title.localeCompare(right.title, "es");
    });

  return {
    films,
    stats: {
      film_count: films.length,
      session_count: rows.length,
      vose_count: rows.filter((row) => row.is_vose).length
    },
    date
  };
}

export async function getFilmBySlug(slug: string): Promise<FilmApiResponse | null> {
  const supabase = createServerSupabaseClient();
  const today = getDateInTimezone(new Date(), MADRID_TIMEZONE);

  const { data: film, error: filmError } = await supabase
    .from("films")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (filmError) throw new Error("Unable to fetch film.");
  if (!film) return null;

  const { data: showtimes, error: showtimesError } = await supabase
    .from("showtimes")
    .select(
      "id, film_id, cinema_id, show_date, show_time, format, language, is_vose, price_eur, booking_url, source_hash, last_seen_at, created_at, cinemas!inner(*)"
    )
    .eq("film_id", film.id)
    .gte("show_date", today)
    .order("show_date", { ascending: true })
    .order("show_time", { ascending: true });

  if (showtimesError) throw new Error("Unable to fetch showtimes for film.");

  const detailed = groupFilmDetail({
    ...film,
    showtimes: (
      (showtimes ?? []) as unknown as Array<Showtime & { cinemas: Cinema | Cinema[] }>
    ).map((showtime) => ({
      ...showtime,
      cinema: Array.isArray(showtime.cinemas) ? showtime.cinemas[0] : showtime.cinemas
    }))
  });

  return { film: detailed };
}

export const API_CACHE_HEADERS = {
  "Cache-Control": DEFAULT_CACHE_CONTROL
};
