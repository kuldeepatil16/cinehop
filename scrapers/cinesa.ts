import { chromium, type Page } from "playwright";

import { DEFAULT_USER_AGENT, MADRID_TIMEZONE, MADRID_CINESA_TARGETS, SPAIN_LOCALE } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { randomDelay } from "@/scrapers/normalise";

const CINESA_PATHS: Record<(typeof MADRID_CINESA_TARGETS)[number], string> = {
  "cinesa-la-gavia": "la-gavia",
  "cinesa-manoteras": "manoteras",
  "cinesa-mendez-alvaro": "mendez-alvaro",
  "cinesa-nassica": "nassica",
  "cinesa-parquesur": "parquesur",
  "cinesa-principe-pio": "principe-pio",
  "cinesa-proyecciones": "proyecciones",
  "cinesa-las-rosas": "las-rosas",
  "cinesa-la-moraleja": "la-moraleja"
};

interface CinesaFilm {
  id: string;
  title: {
    text: string;
  };
}

interface CinesaShowtimeResponse {
  businessDate: string;
  showtimes: Array<{
    id: string;
    filmId: string;
    schedule: {
      businessDate: string;
      startsAt: string;
    };
    attributeIds: string[] | undefined;
  }>;
}

async function captureJsonResponses<T>(
  page: Page,
  matcher: (url: string) => boolean
): Promise<Map<string, T>> {
  const store = new Map<string, T>();

  page.on("response", async (response) => {
    const url = response.url();
    if (!matcher(url)) {
      return;
    }

    try {
      store.set(url, (await response.json()) as T);
    } catch {
      // Ignore non-JSON failures. The scraper falls back to partial results.
    }
  });

  return store;
}

function inferFormat(attributeIds: string[] | undefined): string {
  if (!attributeIds || attributeIds.length === 0) return "Doblada";
  const joined = attributeIds.join(" ");

  if (joined.includes("0000000068")) {
    return "VOSE";
  }
  if (joined.includes("0000000072")) {
    return "IMAX";
  }
  if (joined.includes("0000000073")) {
    return "3D";
  }
  if (joined.includes("0000000108")) {
    return "IMAX";
  }
  if (joined.includes("0000000109")) {
    return "ScreenX";
  }

  return "Doblada";
}

async function scrapeCinema(page: Page, cinemaSlug: (typeof MADRID_CINESA_TARGETS)[number]): Promise<RawShowtime[]> {
  // Remove accumulated listeners from previous cinema iterations
  page.removeAllListeners("response");
  const filmsStore = await captureJsonResponses<{ films: CinesaFilm[] }>(page, (url) => url.endsWith("/films"));
  const showtimesStore = await captureJsonResponses<CinesaShowtimeResponse>(page, (url) =>
    url.includes("/showtimes/by-business-date")
  );

  await page.goto(`https://www.cinesa.es/cines/${CINESA_PATHS[cinemaSlug]}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000
  });
  await randomDelay();

  const dateButtons = page.locator("button, a").filter({ hasText: /mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i });
  if ((await dateButtons.count()) > 1) {
    await dateButtons.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    await randomDelay();
  }

  const films = [...filmsStore.values()].flatMap((value) => value.films);
  const showtimesResponses = [...showtimesStore.values()];
  const filmById = new Map(films.map((film) => [film.id, film.title.text]));

  return showtimesResponses.flatMap((response) =>
    response.showtimes.map((showtime) => ({
      film_title: filmById.get(showtime.filmId) ?? showtime.filmId,
      cinema_name: cinemaSlug.replace(/^cinesa-/, "").replace(/-/g, " "),
      cinema_slug: cinemaSlug,
      chain: "cinesa",
      show_date: showtime.schedule.businessDate,
      show_time: showtime.schedule.startsAt.slice(11, 16),
      raw_format: inferFormat(showtime.attributeIds),
      raw_language: null, // Language inferred during normalisation from format
      price_eur: null,
      booking_url: `https://www.cinesa.es/compra/butacas/?showtimeId=${showtime.id}`
    }))
  );
}

export async function scrapeCinesa(): Promise<ChainScrapePayload> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: DEFAULT_USER_AGENT,
    locale: SPAIN_LOCALE,
    timezoneId: MADRID_TIMEZONE,
    viewport: { width: 1440, height: 1800 }
  });

  const rawShowtimes: RawShowtime[] = [];

  try {
    for (const cinemaSlug of MADRID_CINESA_TARGETS) {
      try {
        rawShowtimes.push(...(await scrapeCinema(page, cinemaSlug)));
      } catch {
        continue;
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  return {
    chain: "cinesa",
    rawShowtimes
  };
}

if ((process.argv[1] ?? "").includes("cinesa.ts")) {
  scrapeCinesa()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
