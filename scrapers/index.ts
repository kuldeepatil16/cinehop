import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createServiceSupabaseClient } from "@/lib/supabase";
import type {
  Chain,
  ChainScrapePayload,
  EnrichedFilmData,
  NormalisedShowtime,
  ScrapeResult
} from "@/lib/types";
import { scrapeCinesa } from "@/scrapers/cinesa";
import { scrapeKinepolis } from "@/scrapers/kinepolis";
import { buildFallbackFilmData } from "@/scrapers/omdb";
import { collectFilmCandidates, computeSourceHash, normaliseShowtime, slugify } from "@/scrapers/normalise";
import { scrapeYelmo } from "@/scrapers/yelmo";

function loadLocalEnv(): void {
  const envPath = join(process.cwd(), ".env.local");

  try {
    const file = readFileSync(envPath, "utf8");
    for (const line of file.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex);
      const value = trimmed.slice(separatorIndex + 1).replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional for local CLI usage.
  }
}

loadLocalEnv();

async function logScrapeRun(result: ScrapeResult): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("scrape_logs").insert([{
      chain: result.chain,
      status: result.status,
      sessions_found: result.sessions_found,
      sessions_new: result.sessions_new,
      sessions_updated: result.sessions_updated,
      error_message: result.error_message ?? null,
      duration_ms: result.duration_ms
    }]);
  } catch {
    // Logging is best-effort. Scrapers must not fail silently but log failures should not crash execution.
  }
}

async function upsertFilms(
  payload: ChainScrapePayload,
  normalisedShowtimes: NormalisedShowtime[]
): Promise<Map<string, string>> {
  const supabase = createServiceSupabaseClient();
  const titleToFilmId = new Map<string, string>();
  const candidates = collectFilmCandidates(payload.rawShowtimes);

  for (const candidate of candidates) {
    // Skip inline OMDB enrichment — it blocks each scrape run by ~600ms per
    // new film. The nightly enrich-posters.ts fills in metadata (poster,
    // rating, synopsis, runtime) for any film that's missing it.
    const fallback = buildFallbackFilmData(candidate);
    let slug = slugify(fallback.title || candidate.title);

    // Slug collision guard: if a film already exists with this slug but a
    // different title (e.g. two films both called "Nosferatu"), disambiguate
    // by appending a short hash of the original scraped title.
    const { data: existing } = await supabase
      .from("films")
      .select("id, title")
      .eq("slug", slug)
      .maybeSingle();
    const existingTitle = (existing as { id?: string; title?: string } | null)?.title;
    if (existingTitle && slugify(existingTitle) !== slugify(candidate.title)) {
      slug = `${slug}-${computeSourceHash(candidate.title).slice(0, 6)}`;
    }

    const filmRow = buildFilmInsert(slug, candidate.title, fallback);
    const { data, error } = await supabase
      .from("films")
      .upsert([filmRow], { onConflict: "slug" })
      .select("id, slug")
      .single();

    if (!error && data) {
      titleToFilmId.set(candidate.title, (data as { id: string }).id);
    }
  }

  for (const showtime of normalisedShowtimes) {
    const existing = titleToFilmId.get(showtime.film_title);
    if (existing) {
      continue;
    }

    const { data } = await supabase
      .from("films")
      .select("id")
      .eq("slug", slugify(showtime.film_title))
      .maybeSingle();

    if ((data as { id?: string } | null)?.id) {
      titleToFilmId.set(showtime.film_title, (data as { id: string }).id);
    }
  }

  return titleToFilmId;
}

function buildFilmInsert(slug: string, fallbackTitle: string, enriched: EnrichedFilmData) {
  return {
    slug,
    title: enriched.title || fallbackTitle,
    title_es: enriched.title_es,
    omdb_id: enriched.omdb_id,
    poster_url: enriched.poster_url,
    backdrop_url: enriched.backdrop_url,
    synopsis: enriched.synopsis,
    synopsis_es: enriched.synopsis_es,
    genre: enriched.genre,
    runtime_min: enriched.runtime_min,
    rating: enriched.rating,
    release_date: enriched.release_date
  };
}

const RETRY_DELAY_MS = 30_000;

async function runChain(
  chainRunner: () => Promise<ChainScrapePayload>,
  fallbackChain: ScrapeResult["chain"],
  attempt = 1
): Promise<ScrapeResult> {
  const startedAt = Date.now();

  try {
    const payload = await chainRunner();
    const supabase = createServiceSupabaseClient();

    const { data: cinemas, error: cinemasError } = await supabase.from("cinemas").select("id, slug, name");
    if (cinemasError || !cinemas) {
      throw new Error("Unable to load cinemas from Supabase.");
    }

    const cinemaMap = new Map(
      (cinemas as Array<{ id: string; slug: string }>).map((cinema) => [cinema.slug, cinema.id])
    );
    const normalised = payload.rawShowtimes
      .map((showtime) => {
        const cinemaId = cinemaMap.get(showtime.cinema_slug);
        return cinemaId ? normaliseShowtime(showtime, cinemaId) : null;
      })
      .filter((showtime): showtime is NormalisedShowtime => Boolean(showtime));

    const titleToFilmId = await upsertFilms(payload, normalised);
    const now = new Date().toISOString();

    // Build rows, skipping any that are missing film/cinema IDs or have
    // clearly invalid data (unresolved HO-IDs, malformed times).
    const TIME_RE = /^\d{2}:\d{2}$/;
    const rows = normalised
      .filter((showtime) => {
        const cinemaId = cinemaMap.get(showtime.cinema_slug);
        const filmId = titleToFilmId.get(showtime.film_title);
        const validTime = TIME_RE.test(showtime.show_time);
        const validTitle = showtime.film_title.length > 0 && !/^HO\d+$/.test(showtime.film_title);
        return cinemaId && filmId && validTime && validTitle;
      })
      .map((showtime) => ({
        film_id: titleToFilmId.get(showtime.film_title)!,
        cinema_id: cinemaMap.get(showtime.cinema_slug)!,
        show_date: showtime.show_date,
        show_time: showtime.show_time,
        format: showtime.format,
        language: showtime.language,
        price_eur: showtime.price_eur,
        booking_url: showtime.booking_url,
        source_hash: showtime.source_hash,
        last_seen_at: now,
      }));

    // Batch upserts in chunks of 200 to stay within PostgREST limits
    // and avoid individual round-trips per showtime (N+1 → N/200 + 1).
    const BATCH_SIZE = 200;
    let sessionsNew = 0;
    let sessionsUpdated = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data } = await supabase
        .from("showtimes")
        .upsert(batch, { onConflict: "cinema_id,film_id,show_date,show_time,format" })
        .select("id");
      sessionsNew += data?.length ?? 0;
      sessionsUpdated += batch.length - (data?.length ?? 0);
    }

    const result: ScrapeResult = {
      chain: payload.chain,
      status: rows.length > 0 ? "success" : "failed",
      sessions_found: normalised.length,
      sessions_new: sessionsNew,
      sessions_updated: sessionsUpdated,
      duration_ms: Date.now() - startedAt
    };

    await logScrapeRun(result);
    return result;
  } catch (error) {
    // One automatic retry after a delay — handles transient network errors and bot-protection
    // soft-blocks that sometimes clear on a second request.
    if (attempt < 2) {
      console.warn(`[${fallbackChain}] Attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return runChain(chainRunner, fallbackChain, attempt + 1);
    }

    const result: ScrapeResult = {
      chain: fallbackChain,
      status: "failed",
      sessions_found: 0,
      sessions_new: 0,
      sessions_updated: 0,
      error_message: error instanceof Error ? error.message : "Unknown scrape error",
      duration_ms: Date.now() - startedAt
    };

    await logScrapeRun(result);
    return result;
  }
}

export async function runAllScrapers(): Promise<ScrapeResult[]> {
  const chains: Array<[Chain, () => Promise<ChainScrapePayload>]> = [
    ["cinesa", scrapeCinesa],
    ["yelmo", scrapeYelmo],
    ["kinepolis", scrapeKinepolis],
  ];
  const results: ScrapeResult[] = [];

  for (const [chainName, scraper] of chains) {
    const result = await runChain(scraper, chainName);
    results.push(result);
  }

  // Invoke the DB-side cleanup function that removes 7-day-old sessions and
  // sessions not refreshed in the last 9 hours (cancelled by cinema).
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.rpc("cleanup_stale_showtimes");
  } catch (err) {
    console.warn("[cleanup] cleanup_stale_showtimes RPC failed:", err);
  }

  return results;
}

if ((process.argv[1] ?? "").includes("index.ts")) {
  runAllScrapers()
    .then((results) => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
