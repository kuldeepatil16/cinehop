/**
 * enrich-posters.ts
 *
 * Standalone script that finds all films with missing metadata (poster_url IS NULL
 * or runtime_min IS NULL) and attempts to enrich them from OMDB.
 *
 * Run manually: npx tsx scrapers/enrich-posters.ts
 * Runs automatically via .github/workflows/enrich.yml (nightly at 02:00 UTC)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createServiceSupabaseClient } from "@/lib/supabase";
import { enrichFilmCandidate } from "@/scrapers/omdb";
import { randomDelay } from "@/scrapers/normalise";

function loadLocalEnv(): void {
  try {
    const file = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep);
      const value = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local is optional in CI
  }
}

async function run(): Promise<void> {
  loadLocalEnv();

  if (!process.env.OMDB_API_KEY) {
    console.error("[enrich] OMDB_API_KEY is not set — cannot enrich. Exiting.");
    process.exitCode = 1;
    return;
  }

  const supabase = createServiceSupabaseClient();

  // Fetch films that are missing at least one key metadata field
  const { data: films, error } = await supabase
    .from("films")
    .select("id, slug, title, title_es, poster_url")
    .or("poster_url.is.null,runtime_min.is.null,synopsis.is.null")
    .order("created_at", { ascending: true })
    .limit(100); // Process up to 100 per run to stay within OMDB free tier (1000/day)

  if (error) {
    console.error("[enrich] Failed to fetch films:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`[enrich] Found ${films?.length ?? 0} films needing enrichment`);

  let enriched = 0;
  let failed = 0;

  for (const film of films ?? []) {
    try {
      const result = await enrichFilmCandidate({
        title: film.title,
        title_es: film.title_es,
        poster_url: film.poster_url,
        backdrop_url: null,
      });

      // Only update if we actually got something new
      const hasNewData =
        (result.poster_url && !film.poster_url) ||
        result.runtime_min ||
        result.synopsis ||
        result.rating;

      if (!hasNewData) {
        console.log(`[enrich] ${film.slug} — no new data from OMDB`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("films")
        .update({
          ...(result.poster_url ? { poster_url: result.poster_url } : {}),
          ...(result.backdrop_url ? { backdrop_url: result.backdrop_url } : {}),
          ...(result.synopsis ? { synopsis: result.synopsis } : {}),
          ...(result.genre ? { genre: result.genre } : {}),
          ...(result.runtime_min ? { runtime_min: result.runtime_min } : {}),
          ...(result.rating ? { rating: result.rating } : {}),
          ...(result.release_date ? { release_date: result.release_date } : {}),
          ...(result.omdb_id ? { omdb_id: result.omdb_id } : {}),
          ...(result.title ? { title: result.title } : {}),
        })
        .eq("id", film.id);

      if (updateError) {
        console.error(`[enrich] Failed to update ${film.slug}:`, updateError.message);
        failed++;
      } else {
        console.log(`[enrich] ✓ ${film.slug} — poster=${!!result.poster_url} rating=${result.rating}`);
        enriched++;
      }

      // Respect OMDB rate limit (1 req/sec on free tier)
      await randomDelay(1100, 1400);
    } catch (err) {
      console.error(`[enrich] Error processing ${film.slug}:`, err);
      failed++;
    }
  }

  console.log(`[enrich] Done — enriched: ${enriched}, failed: ${failed}, skipped: ${(films?.length ?? 0) - enriched - failed}`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
