import { chromium, type Page } from "playwright";

import { DEFAULT_USER_AGENT, MADRID_TIMEZONE, SPAIN_LOCALE, CHAIN_TARGETS } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { extractTimes, randomDelay, toIsoDate, addDays } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

// Kinepolis Madrid — the only Kinepolis in Madrid
const KINEPOLIS_CINEMA = {
  name: "Kinepolis Madrid",
  slug: "kinepolis-madrid"
} as const;

// Candidate API URL patterns to intercept for structured showtime JSON
const API_MATCHERS = [
  (url: string) => url.includes("/api/") && (url.includes("session") || url.includes("showtime") || url.includes("pelicula") || url.includes("movie") || url.includes("cartelera")),
  (url: string) => url.includes("kinepolis") && url.includes(".json"),
];

interface KinepolisApiSession {
  // Common field names in Kinepolis-like APIs (exact names may vary)
  time?: string;
  startsAt?: string;
  start_time?: string;
  hora?: string;
  date?: string;
  fecha?: string;
  show_date?: string;
  format?: string;
  formato?: string;
  attributes?: string[];
  experience?: string;
  movie?: { title?: string; titulo?: string; originalTitle?: string };
  film?: { title?: string; titulo?: string };
  title?: string;
  titulo?: string;
}

/**
 * Attempts to extract structured showtime data from an intercepted API response.
 * Returns null if the response doesn't look like Kinepolis schedule data.
 */
function parseApiResponse(data: unknown, date: string): RawShowtime[] | null {
  if (!data || typeof data !== "object") return null;

  // Try to locate an array of sessions/showtimes in common response shapes
  const candidates: unknown[] = [];
  const obj = data as Record<string, unknown>;

  for (const key of ["sessions", "showtimes", "results", "data", "items", "peliculas", "movies"]) {
    if (Array.isArray(obj[key])) {
      candidates.push(...(obj[key] as unknown[]));
    }
  }
  // Also try root-level array
  if (Array.isArray(data)) {
    candidates.push(...(data as unknown[]));
  }

  if (candidates.length === 0) return null;

  const results: RawShowtime[] = [];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;
    const session = item as KinepolisApiSession;

    const rawTime = session.time ?? session.startsAt ?? session.start_time ?? session.hora;
    if (!rawTime || typeof rawTime !== "string") continue;

    // Extract HH:MM from ISO or raw time strings
    const timeMatch = /(\d{1,2}:\d{2})/.exec(rawTime);
    if (!timeMatch) continue;
    const showTime = timeMatch[1];

    const rawTitle =
      session.movie?.title ?? session.movie?.titulo ?? session.movie?.originalTitle ??
      session.film?.title ?? session.film?.titulo ??
      session.title ?? session.titulo;
    if (!rawTitle || typeof rawTitle !== "string") continue;

    const rawFormat = session.format ?? session.formato ?? session.experience ?? "";
    const showDate = session.date ?? session.fecha ?? session.show_date ?? date;

    results.push({
      film_title: rawTitle.trim(),
      cinema_name: KINEPOLIS_CINEMA.name,
      cinema_slug: KINEPOLIS_CINEMA.slug,
      chain: "kinepolis",
      show_date: /^\d{4}-\d{2}-\d{2}/.test(showDate) ? showDate.slice(0, 10) : date,
      show_time: showTime,
      raw_format: typeof rawFormat === "string" ? rawFormat : String(rawFormat),
      raw_language: null,
      price_eur: null,
      booking_url: null
    });
  }

  return results.length > 0 ? results : null;
}

// Noise line filter for body-text fallback
const NOISE_PATTERN = /^(Kinepolis|Cartelera|Madrid|Ciudad de la Imagen|Menú|Entradas|Cookies|Legal|Política|Inicio|Cines|Películas|403|Suspicious|Bot)/i;

function parseBodyTextFallback(bodyText: string, date: string): RawShowtime[] {
  const lines = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const results: RawShowtime[] = [];
  let currentFilm = "";
  let currentFormat = "";

  for (const line of lines) {
    if (NOISE_PATTERN.test(line) || line.length < 2) continue;

    if (/\b(VOSE|VOSI|VO\b|3D|IMAX|4DX|ScreenX|Dolby|Doblada|ESPAÑOL|SUBTITUL)/i.test(line)) {
      currentFormat = line;
      continue;
    }

    if (/^\d{1,2}:\d{2}/.test(line)) {
      for (const time of extractTimes(line)) {
        results.push({
          film_title: currentFilm,
          cinema_name: KINEPOLIS_CINEMA.name,
          cinema_slug: KINEPOLIS_CINEMA.slug,
          chain: "kinepolis",
          show_date: date,
          show_time: time,
          raw_format: currentFormat,
          raw_language: currentFormat,
          price_eur: null,
          booking_url: null
        });
      }
      continue;
    }

    if (line && !/^\d+$/.test(line)) {
      currentFilm = line;
    }
  }

  return results.filter((item) => item.film_title);
}

async function scrapeForDate(page: Page, date: string): Promise<RawShowtime[]> {
  const capturedApiData: RawShowtime[] = [];

  // Intercept JSON API responses that may contain schedule data
  const responseHandler = async (response: { url: () => string; json: () => Promise<unknown> }) => {
    const url = response.url();
    const isApiCandidate = API_MATCHERS.some((matcher) => matcher(url));
    if (!isApiCandidate) return;

    try {
      const json = await response.json();
      const parsed = parseApiResponse(json, date);
      if (parsed && parsed.length > 0) {
        capturedApiData.push(...parsed);
      }
    } catch {
      // Ignore non-JSON or parse failures
    }
  };

  page.on("response", responseHandler);

  // Try multiple URL patterns for the specific date
  const dateUrls = [
    `https://kinepolis.es/cines/kinepolis-ciudad-de-la-imagen/?fecha=${date}`,
    `https://kinepolis.es/carteleras/madrid?fecha=${date}`,
    `https://kinepolis.es/cines/kinepolis-ciudad-de-la-imagen/cartelera/?fecha=${date}`
  ];

  let bodyText = "";
  let succeeded = false;

  for (const url of dateUrls) {
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (!response || response.status() >= 400) continue;

      await randomDelay(1500, 2500);

      bodyText = await page.locator("body").innerText();
      if (/Suspicious Activity Detected|403 Forbidden/i.test(bodyText)) {
        continue;
      }

      succeeded = true;
      break;
    } catch {
      continue;
    }
  }

  page.removeAllListeners("response");

  if (!succeeded) return [];

  // Prefer structured API data if intercepted; fall back to body text parsing
  if (capturedApiData.length > 0) {
    return capturedApiData;
  }

  return parseBodyTextFallback(bodyText, date);
}

export async function scrapeKinepolis(): Promise<ChainScrapePayload> {
  const root = CHAIN_TARGETS.kinepolis.root;
  if (!await isPathAllowed(root, "/carteleras/madrid")) {
    console.warn("[kinepolis] robots.txt disallows /carteleras/madrid — skipping");
    return { chain: "kinepolis", rawShowtimes: [] };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: DEFAULT_USER_AGENT,
    locale: SPAIN_LOCALE,
    timezoneId: MADRID_TIMEZONE,
    viewport: { width: 1440, height: 2200 }
  });

  const rawShowtimes: RawShowtime[] = [];

  try {
    const today = new Date();
    const tomorrow = addDays(today, 1);

    for (const date of [toIsoDate(today), toIsoDate(tomorrow)]) {
      try {
        const results = await scrapeForDate(page, date);
        rawShowtimes.push(...results);
      } catch {
        continue;
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  return {
    chain: "kinepolis",
    rawShowtimes
  };
}

if ((process.argv[1] ?? "").includes("kinepolis.ts")) {
  scrapeKinepolis()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
