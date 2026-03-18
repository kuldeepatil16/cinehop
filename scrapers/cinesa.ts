import { chromium, type Page } from "playwright";

import { CHAIN_TARGETS, DEFAULT_USER_AGENT, MADRID_TIMEZONE, SCRAPE_CONFIG, SPAIN_LOCALE } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { randomDelay } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

const CINESA_TARGETS = [
  { city: "madrid", slug: "cinesa-la-gavia", path: "la-gavia", name: "Cinesa La Gavia" },
  { city: "madrid", slug: "cinesa-manoteras", path: "manoteras", name: "Cinesa Manoteras" },
  { city: "madrid", slug: "cinesa-mendez-alvaro", path: "mendez-alvaro", name: "Cinesa Mendez Alvaro" },
  { city: "madrid", slug: "cinesa-nassica", path: "nassica", name: "Cinesa Nassica" },
  { city: "madrid", slug: "cinesa-parquesur", path: "parquesur", name: "Cinesa Parquesur" },
  { city: "madrid", slug: "cinesa-principe-pio", path: "principe-pio", name: "Cinesa Principe Pio" },
  { city: "madrid", slug: "cinesa-proyecciones", path: "proyecciones", name: "Cinesa Proyecciones" },
  { city: "madrid", slug: "cinesa-las-rosas", path: "las-rosas", name: "Cinesa Las Rosas" },
  { city: "madrid", slug: "cinesa-la-moraleja", path: "la-moraleja", name: "Cinesa La Moraleja" },
  { city: "barcelona", slug: "cinesa-diagonal", path: "diagonal", name: "Cinesa Diagonal" },
  { city: "barcelona", slug: "cinesa-diagonal-mar", path: "diagonal-mar", name: "Cinesa Diagonal Mar" },
  { city: "barcelona", slug: "cinesa-barnasud", path: "barnasud", name: "Cinesa Barnasud" },
  { city: "valencia", slug: "cinesa-bonaire", path: "bonaire", name: "Cinesa Bonaire" },
  { city: "sevilla", slug: "cinesa-camas", path: "camas", name: "Cinesa Camas" },
  { city: "bilbao", slug: "cinesa-zubiarte", path: "zubiarte", name: "Cinesa Zubiarte" },
  { city: "bilbao", slug: "cinesa-max-ocio", path: "max-ocio", name: "Cinesa Max Ocio" }
] as const;

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

interface ListenerHandle<T> {
  store: Map<string, T>;
  detach: () => void;
}

function attachResponseListener<T>(page: Page, matcher: (url: string) => boolean): ListenerHandle<T> {
  const store = new Map<string, T>();

  const handler = async (response: { url: () => string; json: () => Promise<unknown> }) => {
    const url = response.url();
    if (!matcher(url)) {
      return;
    }

    try {
      store.set(url, (await response.json()) as T);
    } catch {
      // Ignore non-JSON failures.
    }
  };

  page.on("response", handler);
  return { store, detach: () => page.off("response", handler) };
}

function inferFormat(attributeIds: string[] | undefined): string {
  if (!attributeIds || attributeIds.length === 0) {
    return "Doblada";
  }

  const joined = attributeIds.join(" ");

  if (joined.includes("0000000068")) {
    return "VOSE";
  }
  if (joined.includes("0000000072") || joined.includes("0000000108")) {
    return "IMAX";
  }
  if (joined.includes("0000000073")) {
    return "3D";
  }
  if (joined.includes("0000000109")) {
    return "ScreenX";
  }

  return "Doblada";
}

async function scrapeCinema(
  page: Page,
  cinema: (typeof CINESA_TARGETS)[number],
  filmById: Map<string, string>
): Promise<RawShowtime[]> {
  const allShowtimesData: CinesaShowtimeResponse[] = [];

  // Navigate and wait for the initial (today) showtimes API response
  try {
    const [initialResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/showtimes/by-business-date"),
        { timeout: 30_000 }
      ),
      page.goto(`https://www.cinesa.es/cines/${cinema.path}/`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      })
    ]);
    allShowtimesData.push((await initialResponse.json()) as CinesaShowtimeResponse);
  } catch {
    console.warn(`[cinesa] Failed to load initial showtimes for ${cinema.slug}`);
    return [];
  }

  await randomDelay(300, 700);

  // Date tabs: Cinesa renders them as buttons/links like "vie 20 mar", "sáb 21 mar"
  // Select all tab buttons then click each one, waiting for the API response each time.
  const dateButtons = page.locator("[class*='date'], [class*='tab'], [class*='day'], button, a").filter({
    hasText: /\d{1,2}\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i
  });
  const buttonCount = await dateButtons.count();

  // index starts at 0 here — these buttons are ONLY future dates (today already loaded above)
  for (let index = 0; index < Math.min(buttonCount, SCRAPE_CONFIG.days - 1); index += 1) {
    try {
      const [dateResponse] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes("/showtimes/by-business-date"),
          { timeout: 15_000 }
        ),
        dateButtons.nth(index).click({ timeout: 5_000 })
      ]);
      allShowtimesData.push((await dateResponse.json()) as CinesaShowtimeResponse);
    } catch {
      console.warn(`[cinesa] Missed date tab ${index} for ${cinema.slug}`);
    }
    await randomDelay(250, 500);
  }

  return allShowtimesData.flatMap((response) =>
    response.showtimes.map((showtime) => ({
      film_title: filmById.get(showtime.filmId) ?? showtime.filmId,
      cinema_name: cinema.name,
      cinema_slug: cinema.slug,
      chain: "cinesa" as const,
      show_date: showtime.schedule.businessDate,
      show_time: showtime.schedule.startsAt.slice(11, 16),
      raw_format: inferFormat(showtime.attributeIds),
      raw_language: null,
      price_eur: null,
      booking_url: `https://www.cinesa.es/compra/butacas/?showtimeId=${showtime.id}`
    }))
  );
}

export async function scrapeCinesa(): Promise<ChainScrapePayload> {
  const root = CHAIN_TARGETS.cinesa.root;
  if (!await isPathAllowed(root, "/cines/")) {
    console.warn("[cinesa] robots.txt disallows /cines/ - skipping");
    return { chain: "cinesa", rawShowtimes: [] };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: DEFAULT_USER_AGENT,
    locale: SPAIN_LOCALE,
    timezoneId: MADRID_TIMEZONE,
    viewport: { width: 1440, height: 1800 }
  });

  const rawShowtimes: RawShowtime[] = [];

  try {
    const { store: filmsStore } = attachResponseListener<{ films: CinesaFilm[] }>(
      page,
      (url) => url.includes("cinesa.es") && url.includes("/films")
    );
    const filmById = new Map<string, string>();

    function refreshFilmById(): void {
      for (const value of filmsStore.values()) {
        for (const film of value.films ?? []) {
          if (!filmById.has(film.id)) {
            filmById.set(film.id, film.title.text);
          }
        }
      }
    }

    for (const cinema of CINESA_TARGETS) {
      try {
        const results = await scrapeCinema(page, cinema, filmById);
        refreshFilmById();
        rawShowtimes.push(
          ...results.map((result) => ({
            ...result,
            film_title: /^HO\d+$/.test(result.film_title)
              ? (filmById.get(result.film_title) ?? result.film_title)
              : result.film_title
          }))
        );
      } catch {
        continue;
      }
    }

    refreshFilmById();
    const unresolvedIds = [...new Set(rawShowtimes.map((result) => result.film_title).filter((title) => /^HO\d+$/.test(title)))];

    for (const filmId of unresolvedIds) {
      try {
        const response = await fetch(`https://vwc.cinesa.es/WSVistaWebClient/ocapi/v1/films/${filmId}`, {
          headers: { Accept: "application/json", "User-Agent": DEFAULT_USER_AGENT }
        });

        if (response.ok) {
          const data = (await response.json()) as { title?: { text?: string } };
          if (data.title?.text) {
            filmById.set(filmId, data.title.text);
          }
        }
      } catch {
        // Best effort.
      }
    }

    for (const result of rawShowtimes) {
      if (/^HO\d+$/.test(result.film_title) && filmById.has(result.film_title)) {
        result.film_title = filmById.get(result.film_title)!;
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
