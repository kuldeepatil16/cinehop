import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createServiceSupabaseClient } from "@/lib/supabase";
import type {
  Chain,
  ChainScrapePayload,
  EnrichedFilmData,
  NormalisedShowtime,
  ScrapeResult,
  ScrapeStatus
} from "@/lib/types";
import { scrapeCinesa } from "@/scrapers/cinesa";
import { scrapeKinepolis } from "@/scrapers/kinepolis";
import { enrichFilmCandidate } from "@/scrapers/omdb";
import { collectFilmCandidates, normaliseShowtime, randomDelay, slugify } from "@/scrapers/normalise";
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
    const enriched = await enrichFilmCandidate(candidate);
    const slug = slugify(enriched.title || candidate.title);
    const filmRow = buildFilmInsert(slug, candidate.title, enriched);

    const { data, error } = await supabase
      .from("films")
      .upsert([filmRow], {
        onConflict: "slug"
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      titleToFilmId.set(candidate.title, (data as { id: string }).id);
    }

    await randomDelay(250, 650);
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

async function runChain(
  chainRunner: () => Promise<ChainScrapePayload>,
  fallbackChain: ScrapeResult["chain"]
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
    let sessionsNew = 0;
    let sessionsUpdated = 0;

    for (const showtime of normalised) {
      const cinemaId = cinemaMap.get(showtime.cinema_slug);
      const filmId = titleToFilmId.get(showtime.film_title);

      if (!cinemaId || !filmId) {
        continue;
      }

      const row = {
        film_id: filmId,
        cinema_id: cinemaId,
        show_date: showtime.show_date,
        show_time: showtime.show_time,
        format: showtime.format,
        language: showtime.language,
        price_eur: showtime.price_eur,
        booking_url: showtime.booking_url,
        source_hash: showtime.source_hash,
        last_seen_at: new Date().toISOString()
      };

      const { data } = await supabase
        .from("showtimes")
        .upsert([row], {
          onConflict: "cinema_id,film_id,show_date,show_time,format"
        })
        .select("id");

      if (data && data.length > 0) {
        sessionsUpdated += 1;
      } else {
        sessionsNew += 1;
      }
    }

    const result: ScrapeResult = {
      chain: payload.chain,
      status: normalised.length > 0 ? "success" : "partial",
      sessions_found: normalised.length,
      sessions_new: sessionsNew,
      sessions_updated: sessionsUpdated,
      duration_ms: Date.now() - startedAt
    };

    await logScrapeRun(result);
    return result;
  } catch (error) {
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

  // Clean up showtimes older than 7 days
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("showtimes").delete().lt("show_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  } catch (err) {
    console.warn("[cleanup] Failed to clean stale showtimes:", err);
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
