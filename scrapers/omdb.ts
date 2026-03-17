import { OMDB_API_URL } from "@/lib/constants";
import { slugify } from "@/scrapers/normalise";
import type {
  EnrichedFilmData,
  OmdbMovieResponse,
  OmdbSearchResponse,
  ScrapedFilmCandidate
} from "@/lib/types";

function getOmdbKey(): string | null {
  return process.env.OMDB_API_KEY ?? null;
}

let _omdbKeyWarned = false;
function warnIfNoKey(): void {
  if (!process.env.OMDB_API_KEY && !_omdbKeyWarned) {
    console.warn("[omdb] OMDB_API_KEY is not set — film metadata (posters, ratings, synopsis) will not be enriched.");
    _omdbKeyWarned = true;
  }
}

function toAbsolutePoster(url: string | null | undefined): string | null {
  if (!url || url === "N/A") {
    return null;
  }

  return url;
}

function parseRuntime(runtime: string): number | null {
  const match = runtime.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseReleaseDate(released: string): string | null {
  if (!released || released === "N/A") {
    return null;
  }

  const timestamp = Date.parse(released);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function toEnrichedFilmData(
  candidate: ScrapedFilmCandidate,
  movie: OmdbMovieResponse | null
): EnrichedFilmData {
  if (!movie || movie.Response === "False") {
    return {
      title: candidate.title,
      title_es: candidate.title_es,
      omdb_id: null,
      poster_url: candidate.poster_url,
      backdrop_url: candidate.backdrop_url ?? candidate.poster_url,
      synopsis: null,
      synopsis_es: null,
      genre: null,
      runtime_min: null,
      rating: null,
      release_date: null
    };
  }

  const poster = toAbsolutePoster(movie.Poster) ?? candidate.poster_url;

  return {
    title: movie.Title || candidate.title,
    title_es: candidate.title_es && candidate.title_es !== movie.Title ? candidate.title_es : null,
    omdb_id: movie.imdbID ?? null,
    poster_url: poster,
    backdrop_url: candidate.backdrop_url ?? poster,
    synopsis: movie.Plot !== "N/A" ? movie.Plot : null,
    synopsis_es: null, // OMDB only provides English plots; Spanish synopsis requires a separate source
    genre: movie.Genre !== "N/A" ? movie.Genre.split(",").map((entry) => entry.trim()) : null,
    runtime_min: parseRuntime(movie.Runtime),
    rating: movie.imdbRating !== "N/A" ? Number.parseFloat(movie.imdbRating) : null,
    release_date: parseReleaseDate(movie.Released)
  };
}

async function omdbFetch<T>(params: URLSearchParams): Promise<T | null> {
  const key = getOmdbKey();

  if (!key) {
    return null;
  }

  params.set("apikey", key);
  const response = await fetch(`${OMDB_API_URL}?${params.toString()}`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    },
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function enrichFilmCandidate(candidate: ScrapedFilmCandidate): Promise<EnrichedFilmData> {
  warnIfNoKey();
  const fallback = toEnrichedFilmData(candidate, null);
  const search = await omdbFetch<OmdbSearchResponse>(
    new URLSearchParams({
      s: candidate.title,
      type: "movie"
    })
  );

  const first = search?.Search?.[0];
  if (!first) {
    return fallback;
  }

  await new Promise((resolve) => setTimeout(resolve, 300));
  const movie = await omdbFetch<OmdbMovieResponse>(
    new URLSearchParams({
      i: first.imdbID,
      plot: "full"
    })
  );

  return toEnrichedFilmData(candidate, movie);
}

export function buildFallbackFilmData(candidate: ScrapedFilmCandidate): EnrichedFilmData {
  return {
    title: candidate.title,
    title_es: candidate.title_es,
    omdb_id: null,
    poster_url: candidate.poster_url,
    backdrop_url: candidate.backdrop_url ?? candidate.poster_url,
    synopsis: null,
    synopsis_es: null,
    genre: null,
    runtime_min: null,
    rating: null,
    release_date: null
  };
}

export function buildFilmSlug(candidate: ScrapedFilmCandidate, enriched: EnrichedFilmData): string {
  return slugify(enriched.title || candidate.title);
}
