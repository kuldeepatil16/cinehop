import { chromium, type Page } from "playwright";

import { DEFAULT_USER_AGENT, MADRID_TIMEZONE, MADRID_CINESA_TARGETS, SPAIN_LOCALE, CHAIN_TARGETS } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { randomDelay } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

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

interface ListenerHandle<T> {
  store: Map<string, T>;
  /** Remove this specific listener from the page without touching others. */
  detach: () => void;
}

function attachResponseListener<T>(
  page: Page,
  matcher: (url: string) => boolean
): ListenerHandle<T> {
  const store = new Map<string, T>();

  const handler = async (response: { url: () => string; json: () => Promise<unknown> }) => {
    const url = response.url();
    if (!matcher(url)) return;
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

async function scrapeCinema(
  page: Page,
  cinemaSlug: (typeof MADRID_CINESA_TARGETS)[number],
  filmById: Map<string, string>
): Promise<RawShowtime[]> {
  // Attach a fresh showtimes listener for this cinema only.
  // We use page.off to remove ONLY this listener afterwards — preserving the global
  // films listener which must stay alive across all cinema iterations.
  const { store: showtimesStore, detach: detachShowtimes } = attachResponseListener<CinesaShowtimeResponse>(
    page,
    (url) => url.includes("/showtimes/by-business-date")
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

  const showtimesResponses = [...showtimesStore.values()];
  detachShowtimes();

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
  const root = CHAIN_TARGETS.cinesa.root;
  if (!await isPathAllowed(root, "/cines/")) {
    console.warn("[cinesa] robots.txt disallows /cines/ — skipping");
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
    // Capture ANY VWC films endpoint — including the global /films and per-site
    // /films?siteIds=027 variants. Using includes("/v1/films") catches both.
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

    for (const cinemaSlug of MADRID_CINESA_TARGETS) {
      try {
        const results = await scrapeCinema(page, cinemaSlug, filmById);
        refreshFilmById();
        rawShowtimes.push(...results.map((r) => ({
          ...r,
          film_title: /^HO\d+$/.test(r.film_title) ? (filmById.get(r.film_title) ?? r.film_title) : r.film_title
        })));
      } catch {
        continue;
      }
    }

    // Final pass: resolve any HO IDs that still weren't captured via interception.
    // The VWC API accepts individual film IDs directly.
    refreshFilmById();
    const unresolvedIds = [...new Set(
      rawShowtimes
        .map((r) => r.film_title)
        .filter((t) => /^HO\d+$/.test(t))
    )];

    if (unresolvedIds.length > 0) {
      console.log(`[cinesa] Resolving ${unresolvedIds.length} unmatched film IDs via API...`);
      for (const filmId of unresolvedIds) {
        try {
          const res = await fetch(
            `https://vwc.cinesa.es/WSVistaWebClient/ocapi/v1/films/${filmId}`,
            { headers: { Accept: "application/json", "User-Agent": DEFAULT_USER_AGENT } }
          );
          if (res.ok) {
            const data = await res.json() as { id?: string; title?: { text?: string } };
            if (data?.title?.text) {
              filmById.set(filmId, data.title.text);
            }
          }
        } catch {
          // Best-effort — unresolved IDs stay as-is
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Apply resolved titles to the collected showtimes
      for (const r of rawShowtimes) {
        if (/^HO\d+$/.test(r.film_title) && filmById.has(r.film_title)) {
          r.film_title = filmById.get(r.film_title)!;
        }
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
