import { chromium, type Locator, type Page } from "playwright";

import { CHAIN_TARGETS, DEFAULT_USER_AGENT, MADRID_TIMEZONE, SCRAPE_CONFIG, SPAIN_LOCALE } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { extractTimes, parseEuroPrice, randomDelay, toIsoDate } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

// Cinema targets. `value` matches both the #ddlCinema dropdown value and the
// direct URL path segment: https://yelmocines.es/cartelera/{city}/{value}
// Verified against live site on 2026-03-18.
const YELMO_CITY_TARGETS = [
  {
    cityUrl: "https://yelmocines.es/cartelera/madrid",
    cinemas: [
      { value: "ideal", slug: "yelmo-ideal", name: "Yelmo Ideal" },
      { value: "islazul", slug: "yelmo-islazul", name: "Yelmo Islazul" },
      { value: "la-vaguada", slug: "yelmo-la-vaguada", name: "Yelmo La Vaguada" },
      { value: "plenilunio", slug: "yelmo-plenilunio", name: "Yelmo Plenilunio" },
      { value: "planetocio", slug: "yelmo-planetocio", name: "Yelmo Planetocio" },
      { value: "rivas-h2o", slug: "yelmo-rivas-h2o", name: "Yelmo Rivas H2O" },
      { value: "tresaguas", slug: "yelmo-tresaguas", name: "Yelmo TresAguas" },
      { value: "plaza-norte-2", slug: "yelmo-plaza-norte", name: "Yelmo Plaza Norte 2" },
      { value: "palafox-luxury", slug: "yelmo-palafox-luxury", name: "Yelmo Palafox Luxury" },
      { value: "premium-parque-corredor", slug: "yelmo-parque-corredor", name: "Yelmo Premium Parque Corredor" },
    ],
  },
  {
    cityUrl: "https://yelmocines.es/cartelera/barcelona",
    cinemas: [
      { value: "baricentro", slug: "yelmo-baricentro", name: "Yelmo Baricentro" },
      { value: "abrera", slug: "yelmo-abrera", name: "Yelmo Abrera" },
      { value: "premium-sant-cugat", slug: "yelmo-sant-cugat", name: "Yelmo Premium Sant Cugat" },
      { value: "premium-castelldefels", slug: "yelmo-castelldefels", name: "Yelmo Premium Castelldefels" },
      { value: "westfield-la-maquinista", slug: "yelmo-la-maquinista", name: "Yelmo Westfield La Maquinista" },
    ],
  },
  {
    cityUrl: "https://yelmocines.es/cartelera/valencia",
    cinemas: [
      { value: "mercado-de-campanar", slug: "yelmo-campanar", name: "Yelmo Mercado de Campanar" },
      { value: "vidanova-parc", slug: "yelmo-vidanova-parc", name: "Yelmo VidaNova Parc" },
    ],
  },
  {
    cityUrl: "https://yelmocines.es/cartelera/sevilla",
    cinemas: [
      { value: "-premium-lagoh", slug: "yelmo-lagoh", name: "Yelmo Premium Lagoh" },
    ],
  },
  // Bilbao: Yelmo has no cinemas in Bilbao. Omitted.
] as const;

// Format/language line detector — same pattern used in both parsers
const FORMAT_LINE_RE =
  /\b(VOSE|VOSI|VO\b|3D|IMAX|4DX|ScreenX|Dolby|Doblada|ESPAÑOL|SUBTITUL)/i;

function parseDateOption(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? toIsoDate(new Date()) : toIsoDate(parsed);
}

/**
 * Parse showtime data from a single .tituloPelicula DOM block.
 *
 * All three pieces of data (title, format, booking links) are extracted from
 * within the same element, so there is no cross-block state and no positional
 * link-alignment hack.
 */
async function parseFilmBlock(
  block: Locator,
  cinemaName: string,
  cinemaSlug: string,
  date: string
): Promise<RawShowtime[]> {
  const blockText = await block.innerText().catch(() => "");
  const lines = blockText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Film title: first line that is not a time cluster and not a format label.
  // Within a .tituloPelicula block the very first meaningful line IS the title.
  const filmTitle = lines.find(
    (l) => !/^\d{1,2}:\d{2}/.test(l) && !FORMAT_LINE_RE.test(l) && l.length > 1
  ) ?? "";

  if (!filmTitle) return [];

  // Booking links scoped to this block — perfect 1:1 alignment with time
  // lines in the same block. No global linkIndex fragility.
  const blockLinks = await block.locator("a").evaluateAll((nodes) =>
    nodes
      .map((n) => ({
        time: (n.textContent ?? "").trim(),
        href: (n as HTMLAnchorElement).href,
      }))
      .filter((l) => /^\d{1,2}:\d{2}$/.test(l.time))
  );

  const results: RawShowtime[] = [];
  let currentFormat = "";
  let linkIndex = 0;

  for (const line of lines) {
    if (line === filmTitle) continue; // already captured above

    if (FORMAT_LINE_RE.test(line)) {
      currentFormat = line;
      continue;
    }

    if (/^\d{1,2}:\d{2}/.test(line)) {
      for (const time of extractTimes(line)) {
        const booking =
          blockLinks.find((l, i) => i >= linkIndex && l.time === time) ??
          blockLinks[linkIndex];
        results.push({
          film_title: filmTitle,
          cinema_name: cinemaName,
          cinema_slug: cinemaSlug,
          chain: "yelmo",
          show_date: date,
          show_time: time,
          raw_format: currentFormat,
          raw_language: currentFormat,
          price_eur: parseEuroPrice(null),
          booking_url: booking?.href ?? null,
        });
        linkIndex += 1;
      }
    }
  }

  return results;
}

/**
 * Fallback: parse the full body text if .tituloPelicula is not present.
 * Kept from the original implementation — handles any future DOM restructure
 * where the selector changes but text content still follows the same pattern.
 */
const BODY_NOISE_RE =
  /^(Cartelera|Horarios|Formato|Idioma|Experiencia|Día|VOLVER ARRIBA|Estreno|Yelmo|yelmocines|Madrid|Barcelona|Valencia|Sevilla|Bilbao|Cookies|Aviso Legal|Política|Ver más|Comprar|TP|M-|PDC|\+18|NR|MADRID)/i;

function parseBodyTextFallback(
  cinemaName: string,
  cinemaSlug: string,
  date: string,
  bodyLines: string[],
  bookingLinks: Array<{ time: string; href: string }>
): RawShowtime[] {
  const results: RawShowtime[] = [];
  let currentFilm = "";
  let currentFormat = "";
  let linkIndex = 0;

  for (const line of bodyLines) {
    if (BODY_NOISE_RE.test(line) || line.length < 2) continue;

    if (/^\d{1,2}:\d{2}/.test(line)) {
      for (const time of extractTimes(line)) {
        const booking =
          bookingLinks.find((l, i) => i >= linkIndex && l.time === time) ??
          bookingLinks[linkIndex];
        results.push({
          film_title: currentFilm,
          cinema_name: cinemaName,
          cinema_slug: cinemaSlug,
          chain: "yelmo",
          show_date: date,
          show_time: time,
          raw_format: currentFormat,
          raw_language: currentFormat,
          price_eur: parseEuroPrice(null),
          booking_url: booking?.href ?? null,
        });
        linkIndex += 1;
      }
      continue;
    }

    if (FORMAT_LINE_RE.test(line)) {
      currentFormat = line;
      continue;
    }

    if (!/^\d+$/.test(line)) {
      currentFilm = line;
    }
  }

  return results.filter((r) => r.film_title);
}

/**
 * Extract showtimes for the cinema currently shown on the page.
 *
 * Strategy (in priority order):
 *   1. Scoped .tituloPelicula DOM blocks — each block is one film, links
 *      are scoped to the block, no global join needed.
 *   2. Full body text fallback — original approach, used only if the CSS
 *      selector yields nothing (e.g. Yelmo redesigned their DOM).
 */
async function extractShowtimesFromPage(
  page: Page,
  cinemaName: string,
  cinemaSlug: string,
  date: string
): Promise<RawShowtime[]> {
  // Strategy 1: scoped .tituloPelicula extraction
  const filmBlocks = await page.locator(".tituloPelicula").all();

  if (filmBlocks.length > 0) {
    console.log(`[yelmo] ${cinemaSlug} ${date} — ${filmBlocks.length} film blocks via .tituloPelicula`);
    const all: RawShowtime[] = [];
    for (const block of filmBlocks) {
      all.push(...await parseFilmBlock(block, cinemaName, cinemaSlug, date));
    }
    if (all.length > 0) return all;
    // Blocks existed but yielded no showtimes — fall through to body text
    console.log(`[yelmo] ${cinemaSlug} — blocks empty, falling back to body text`);
  } else {
    console.log(`[yelmo] ${cinemaSlug} — .tituloPelicula not found, falling back to body text`);
  }

  // Strategy 2: full body text fallback
  const bookingLinks = await page.locator("a").evaluateAll((nodes) =>
    nodes
      .map((n) => ({
        time: (n.textContent ?? "").trim(),
        href: (n as HTMLAnchorElement).href,
      }))
      .filter((n) => /^\d{1,2}:\d{2}$/.test(n.time))
  );
  const bodyText = await page.locator("body").innerText();
  const bodyLines = bodyText.split("\n").map((l) => l.trim()).filter(Boolean);
  return parseBodyTextFallback(cinemaName, cinemaSlug, date, bodyLines, bookingLinks);
}

export async function scrapeYelmo(): Promise<ChainScrapePayload> {
  const root = CHAIN_TARGETS.yelmo.root;
  if (!await isPathAllowed(root, "/cartelera/madrid")) {
    console.warn("[yelmo] robots.txt disallows /cartelera — skipping");
    return { chain: "yelmo", rawShowtimes: [] };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: DEFAULT_USER_AGENT,
    locale: SPAIN_LOCALE,
    timezoneId: MADRID_TIMEZONE,
    viewport: { width: 1440, height: 2200 },
  });

  const rawShowtimes: RawShowtime[] = [];

  try {
    for (const cityTarget of YELMO_CITY_TARGETS) {
      for (const cinema of cityTarget.cinemas) {
        // Navigate directly to the cinema's own URL — no #ddlCinema dropdown
        // needed. The city page pre-selects the cinema server-side.
        // e.g. https://yelmocines.es/cartelera/madrid/ideal
        const directUrl = `${cityTarget.cityUrl}/${cinema.value}`;

        try {
          await page.goto(directUrl, {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
          });

          // Dismiss cookie banner — catch silently if already dismissed or absent
          await page
            .getByRole("button", { name: /Permitir todas|Aceptar/i })
            .click({ timeout: 5_000 })
            .catch(() => undefined);

          // Wait for the .tituloPelicula elements that signal rendered content.
          // This is more reliable than waitForResponse because it waits for
          // the exact DOM state we need, not a proxy network event.
          await page
            .waitForSelector(".tituloPelicula", { timeout: 15_000 })
            .catch(() => undefined);
          await randomDelay(300, 600);

          // Read available dates from the date dropdown
          const dateOptions = await page
            .locator("#ddlDate option")
            .evaluateAll((nodes) =>
              nodes
                .map((n) => ({
                  text: n.textContent?.trim() ?? "",
                  value: (n as HTMLOptionElement).value,
                }))
                .filter((n) => n.value && n.value !== "0")
                .slice(0, SCRAPE_CONFIG.days)
            );

          // Always scrape at least the currently-shown date
          const datesToScrape =
            dateOptions.length > 0 ? dateOptions : [{ text: "", value: "" }];

          for (const dateOption of datesToScrape) {
            if (dateOption.value) {
              // Select the date — wait for DOM update signalled by .tituloPelicula
              // changing count (stale elements detach and new ones attach).
              const prevCount = await page.locator(".tituloPelicula").count();
              await page.selectOption("#ddlDate", dateOption.value).catch(() => undefined);
              // Wait until the film block count changes, or fall back to a short delay
              await page
                .waitForFunction(
                  (prev) => document.querySelectorAll(".tituloPelicula").length !== prev,
                  prevCount,
                  { timeout: 10_000 }
                )
                .catch(() => randomDelay(1000, 1500));
            }

            const date = dateOption.value
              ? parseDateOption(dateOption.value)
              : toIsoDate(new Date());

            rawShowtimes.push(
              ...await extractShowtimesFromPage(page, cinema.name, cinema.slug, date)
            );
          }
        } catch {
          console.warn(`[yelmo] Failed to scrape ${cinema.slug} — skipping`);
        }
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  return { chain: "yelmo", rawShowtimes };
}

if ((process.argv[1] ?? "").includes("yelmo.ts")) {
  scrapeYelmo()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
