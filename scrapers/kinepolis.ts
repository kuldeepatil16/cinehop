import { chromium, type Page } from "playwright";

import { CHAIN_TARGETS, DEFAULT_USER_AGENT, MADRID_TIMEZONE, SCRAPE_CONFIG, SPAIN_LOCALE } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { addDays, toIsoDate } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

const KINEPOLIS_TARGETS = [
  { complexCode: "KMAD", slug: "kinepolis-madrid", name: "Kinepolis Madrid" },
  { complexCode: "PFULL", slug: "kinepolis-barcelona-splau", name: "Kinepolis Barcelona Splau" },
  { complexCode: "KVAL", slug: "kinepolis-valencia", name: "Kinepolis Valencia" }
] as const;

interface KinepolisCurrentMoviesPayload {
  sessions?: KinepolisSession[];
  films?: KinepolisFilm[];
}

interface KinepolisSession {
  complexOperator: string;
  showtime: string;
  vistaSessionId: number;
  film: {
    id: string;
    format?: {
      name?: string;
    };
  };
  sessionAttributes?: Array<{
    name?: string;
    shortName?: string;
    code?: string;
  }>;
}

interface KinepolisFilm {
  id: string;
  title: string;
  images?: Array<{
    mediaType?: string;
    url?: string;
  }>;
}

function buildAllowedDates(): Set<string> {
  const allowedDates = new Set<string>();
  const today = new Date();

  for (let index = 0; index < SCRAPE_CONFIG.days; index += 1) {
    allowedDates.add(toIsoDate(addDays(today, index)));
  }

  return allowedDates;
}

function formatMadridDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dateString));
}

function formatMadridTime(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(dateString));
}

function buildRawFormat(session: KinepolisSession): string {
  const parts = [
    session.film.format?.name,
    ...(session.sessionAttributes ?? []).flatMap((attribute) =>
      [attribute.name, attribute.shortName, attribute.code].filter(Boolean)
    )
  ];

  return [...new Set(parts.map((part) => part!.trim()).filter(Boolean))].join(" ");
}

function buildPosterUrl(film: KinepolisFilm | undefined): string | undefined {
  const poster = film?.images?.find((image) => image.mediaType === "Poster Graphic")?.url;
  return poster ? `https://cdn.kinepolis.es${poster}` : undefined;
}

async function loadCurrentMovies(page: Page): Promise<KinepolisCurrentMoviesPayload> {
  await page.goto(`https://kinepolis.es/?complex=${KINEPOLIS_TARGETS[0].complexCode}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await page.waitForTimeout(4_000);

  const bodyText = await page.locator("body").innerText();
  if (/Suspicious Activity Detected|403 Blocked/i.test(bodyText)) {
    throw new Error(
      "Kinepolis blocked the scraper with anti-bot protection. Run this chain in headed Chromium under xvfb."
    );
  }

  const currentMovies = await page.evaluate(() => {
    const drupal = (globalThis as { Drupal?: { settings?: { variables?: { current_movies?: unknown } } } }).Drupal;
    return drupal?.settings?.variables?.current_movies ?? null;
  });

  if (!currentMovies) {
    throw new Error("Kinepolis page loaded without current_movies data.");
  }

  return currentMovies as KinepolisCurrentMoviesPayload;
}

export async function scrapeKinepolis(): Promise<ChainScrapePayload> {
  const root = CHAIN_TARGETS.kinepolis.root;
  if (!await isPathAllowed(root, "/")) {
    console.warn("[kinepolis] robots.txt disallows / - skipping");
    return { chain: "kinepolis", rawShowtimes: [] };
  }

  const browser = await chromium.launch({
    headless: process.env.KINEPOLIS_HEADFUL === "1" ? false : true
  });
  const page = await browser.newPage({
    userAgent: DEFAULT_USER_AGENT,
    locale: SPAIN_LOCALE,
    timezoneId: MADRID_TIMEZONE,
    viewport: { width: 1440, height: 2200 }
  });

  try {
    const data = await loadCurrentMovies(page);
    const allowedDates = buildAllowedDates();
    const filmById = new Map<string, KinepolisFilm>((data.films ?? []).map((film) => [film.id, film]));
    const targetByComplex = new Map<string, (typeof KINEPOLIS_TARGETS)[number]>(
      KINEPOLIS_TARGETS.map((target) => [target.complexCode, target])
    );

    const rawShowtimes: RawShowtime[] = (data.sessions ?? [])
      .filter((session) => targetByComplex.has(session.complexOperator))
      .map((session) => {
        const film = filmById.get(session.film.id);
        const targetCinema = targetByComplex.get(session.complexOperator)!;

        return {
          film_title: film?.title ?? session.film.id,
          poster_url: buildPosterUrl(film),
          cinema_name: targetCinema.name,
          cinema_slug: targetCinema.slug,
          chain: "kinepolis" as const,
          show_date: formatMadridDate(session.showtime),
          show_time: formatMadridTime(session.showtime),
          raw_format: buildRawFormat(session),
          raw_language: buildRawFormat(session),
          price_eur: null,
          booking_url: `https://kinepolis.es/direct-vista-redirect/${session.vistaSessionId}/0/${targetCinema.complexCode}/0`
        };
      })
      .filter((showtime) => allowedDates.has(showtime.show_date));

    return {
      chain: "kinepolis",
      rawShowtimes
    };
  } finally {
    await page.close();
    await browser.close();
  }
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
