import { DEFAULT_CACHE_CONTROL } from "@/lib/constants";
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
import { buildFilmCardData, groupFilmDetail, resolveQueryDate } from "@/lib/utils";

type JoinedShowtimeRow = Showtime & {
  films: Film | Film[] | null;
  cinemas: Cinema | Cinema[] | null;
};

function toFilmMap(rows: JoinedShowtimeRow[]): FilmWithShowtimes[] {
  const filmMap = new Map<string, FilmWithShowtimes>();

  for (const row of rows) {
    const film = Array.isArray(row.films) ? row.films[0] : row.films;
    const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;

    if (!film || !cinema) {
      continue;
    }

    const current = filmMap.get(film.id) ?? {
      ...film,
      showtimes: []
    };

    current.showtimes.push({
      ...row,
      cinema
    });
    filmMap.set(film.id, current);
  }

  return [...filmMap.values()];
}

export async function getFilmsForDate(params: FilmsApiParams = {}): Promise<FilmsApiResponse> {
  const supabase = createServerSupabaseClient();
  let date = resolveQueryDate(params.date);

  let query = buildShowtimesQuery(supabase, date);

  if (params.vose === "true") {
    query = query.eq("is_vose", true);
  }

  if (params.format) {
    query = query.eq("format", params.format);
  }

  if (params.language) {
    query = query.eq("language", params.language);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to fetch films: ${error.message}`);
  }

  let rows = (data ?? []) as unknown as JoinedShowtimeRow[];

  if (rows.length === 0 && (!params.date || params.date === "today" || params.date === "tomorrow")) {
    const { data: latest } = await supabase
      .from("showtimes")
      .select("show_date")
      .order("show_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.show_date) {
      date = latest.show_date;
      const { data: fallbackData, error: fallbackError } = await buildShowtimesQuery(supabase, date);
      if (!fallbackError) {
        rows = (fallbackData ?? []) as unknown as JoinedShowtimeRow[];
      }
    }
  }

  if (params.city) {
    rows = rows.filter((row) => {
      const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;
      return cinema?.city === params.city;
    });
  }

  if (params.chain) {
    rows = rows.filter((row) => {
      const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;
      return cinema?.chain === params.chain;
    });
  }

  if (params.zone) {
    rows = rows.filter((row) => {
      const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;
      return cinema?.zone === params.zone;
    });
  }

  if (params.price_max) {
    const priceMax = Number.parseFloat(params.price_max);
    if (Number.isFinite(priceMax)) {
      rows = rows.filter((row) => row.price_eur === null || row.price_eur <= priceMax);
    }
  }

  if (params.q) {
    const queryText = params.q.trim().toLowerCase();
    rows = rows.filter((row) => {
      const film = Array.isArray(row.films) ? row.films[0] : row.films;
      const filmTitle = `${film?.title ?? ""} ${film?.title_es ?? ""}`.toLowerCase();
      const cinema = Array.isArray(row.cinemas) ? row.cinemas[0] : row.cinemas;
      const cinemaName = cinema?.name.toLowerCase() ?? "";
      return filmTitle.includes(queryText) || cinemaName.includes(queryText);
    });
  }

  if (params.vose === "true") {
    rows = rows.filter((row) => row.is_vose);
  }

  if (params.format) {
    rows = rows.filter((row) => row.format === params.format);
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

// Sessions not refreshed within 8 hours (≈2 scrape cycles at 3h cadence + buffer) are
// considered stale and hidden from users — they may have been cancelled by the cinema.
const STALE_AFTER_MS = 8 * 60 * 60 * 1000;

function freshnessThreshold(): string {
  return new Date(Date.now() - STALE_AFTER_MS).toISOString();
}

function buildShowtimesQuery(supabase: ReturnType<typeof createServerSupabaseClient>, date: string) {
  return supabase
    .from("showtimes")
    .select(
      "id, film_id, cinema_id, show_date, show_time, format, language, is_vose, price_eur, booking_url, source_hash, last_seen_at, created_at, films!inner(*), cinemas!inner(*)"
    )
    .eq("show_date", date)
    .order("show_time", { ascending: true });
}

export async function getFilmBySlug(slug: string): Promise<FilmApiResponse | null> {
  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: film, error: filmError } = await supabase.from("films").select("*").eq("slug", slug).maybeSingle();

  if (filmError) {
    throw new Error("Unable to fetch film.");
  }

  if (!film) {
    return null;
  }

  const { data: showtimes, error: showtimesError } = await supabase
    .from("showtimes")
    .select("id, film_id, cinema_id, show_date, show_time, format, language, is_vose, price_eur, booking_url, source_hash, last_seen_at, created_at, cinemas!inner(*)")
    .eq("film_id", film.id)
    .gte("show_date", today)
    .order("show_date", { ascending: true })
    .order("show_time", { ascending: true });

  if (showtimesError) {
    throw new Error("Unable to fetch showtimes for film.");
  }

  const detailed = groupFilmDetail({
    ...film,
    showtimes: ((showtimes ?? []) as unknown as Array<Showtime & { cinemas: Cinema | Cinema[] }>).map((showtime) => ({
      ...showtime,
      cinema: Array.isArray(showtime.cinemas) ? showtime.cinemas[0] : showtime.cinemas
    }))
  });

  return {
    film: detailed
  };
}

export const API_CACHE_HEADERS = {
  "Cache-Control": DEFAULT_CACHE_CONTROL
};
