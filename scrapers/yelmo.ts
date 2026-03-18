import { chromium } from "playwright";

import { CHAIN_TARGETS, DEFAULT_USER_AGENT, MADRID_TIMEZONE, SCRAPE_CONFIG, SPAIN_LOCALE } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { extractTimes, parseEuroPrice, randomDelay, toIsoDate } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

// All Yelmo cinemas organised by city page URL.
// The `value` field must match the <option value="..."> in the #ddlCinema dropdown.
// Dropdown values verified against live #ddlCinema options on 2026-03-18.
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
  // Bilbao: Yelmo's /cartelera/bilbao page defaults to showing Madrid cinemas in
  // the dropdown — Yelmo has no cinemas in Bilbao. Omitted to avoid duplicate data.
] as const;

// Noise lines to skip when parsing body text
const NOISE_PATTERN =
  /^(Cartelera|Horarios|Formato|Idioma|Experiencia|Día|VOLVER ARRIBA|Estreno|Yelmo|yelmocines|Madrid|Barcelona|Valencia|Sevilla|Bilbao|Cookies|Aviso Legal|Política|Ver más|Comprar|TP|M-|PDC|\+18|NR|MADRID)/i;

/**
 * Parses the body text of the currently-selected Yelmo cinema page.
 */
function parseShowtimeText(
  cinemaName: string,
  cinemaSlug: string,
  date: string,
  bodyLines: string[],
  bookingLinks: Array<{ time: string; href: string }>
): RawShowtime[] {
  const results: RawShowtime[] = [];
  let currentFilm = "";
  let currentLanguage = "";
  let linkIndex = 0;

  for (const line of bodyLines) {
    if (NOISE_PATTERN.test(line) || line.length < 2) {
      continue;
    }

    if (/^\d{1,2}:\d{2}/.test(line)) {
      const times = extractTimes(line);
      for (const time of times) {
        const booking =
          bookingLinks.find((l, i) => i >= linkIndex && l.time === time) ?? bookingLinks[linkIndex];
        results.push({
          film_title: currentFilm,
          cinema_name: cinemaName,
          cinema_slug: cinemaSlug,
          chain: "yelmo",
          show_date: date,
          show_time: time,
          raw_format: currentLanguage,
          raw_language: currentLanguage,
          price_eur: parseEuroPrice(null),
          booking_url: booking?.href ?? null,
        });
        linkIndex += 1;
      }
      continue;
    }

    if (/\b(VOSE|VOSI|VO\b|3D|IMAX|4DX|ScreenX|Dolby|Doblada|ESPAÑOL|SUBTITUL)/i.test(line)) {
      currentLanguage = line;
      continue;
    }

    if (line && !/^\d+$/.test(line)) {
      currentFilm = line;
    }
  }

  return results.filter((item) => item.film_title);
}

function parseDateOption(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? toIsoDate(new Date()) : toIsoDate(parsed);
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
      try {
        await page.goto(cityTarget.cityUrl, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });

        // Dismiss cookie banner once (only fires on first page load)
        await page
          .getByRole("button", { name: /Permitir todas|Aceptar/i })
          .click({ timeout: 8_000 })
          .catch(() => undefined);
        await randomDelay(1000, 2000);

        // Read actual dropdown values — logs mismatches so we can fix them
        const availableOptions = await page
          .locator("#ddlCinema option")
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              value: (n as HTMLOptionElement).value,
              text: n.textContent?.trim() ?? "",
            }))
          ).catch(() => [] as Array<{ value: string; text: string }>);

        const availableValues = new Set(availableOptions.map((o) => o.value));
        console.log(`[yelmo] ${cityTarget.cityUrl} — dropdown options:`, JSON.stringify(availableOptions));

        const matchCount = cityTarget.cinemas.filter((c) => availableValues.has(c.value)).length;
        console.log(`[yelmo] Matched ${matchCount}/${cityTarget.cinemas.length} expected cinemas`);

        for (const cinema of cityTarget.cinemas) {
          if (!availableValues.has(cinema.value) && availableValues.size > 0) {
            console.warn(`[yelmo] Dropdown value "${cinema.value}" not found for ${cinema.slug} — skipping`);
            continue;
          }
          try {
            await page.selectOption("#ddlCinema", cinema.value);
            await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
            await randomDelay(800, 1500);

            const dateOptions = await page
              .locator("#ddlDate option")
              .evaluateAll((nodes) =>
                nodes
                  .map((node) => ({
                    text: node.textContent?.trim() ?? "",
                    value: (node as HTMLOptionElement).value,
                  }))
                  .filter((node) => node.value && node.value !== "0")
                  .slice(0, SCRAPE_CONFIG.days)
              );

            const datesToScrape =
              dateOptions.length > 0 ? dateOptions : [{ text: "", value: "" }];

            for (const dateOption of datesToScrape) {
              if (dateOption.value) {
                await page.selectOption("#ddlDate", dateOption.value).catch(() => undefined);
                await page
                  .waitForLoadState("networkidle", { timeout: 10_000 })
                  .catch(() => undefined);
                await randomDelay(800, 1500);
              }

              const bookingLinks = await page.locator("a").evaluateAll((nodes) =>
                nodes
                  .map((node) => ({
                    time: (node.textContent ?? "").trim(),
                    href: (node as HTMLAnchorElement).href,
                  }))
                  .filter((node) => /^\d{1,2}:\d{2}$/.test(node.time))
              );

              const bodyText = await page.locator("body").innerText();
              const bodyLines = bodyText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

              const date = dateOption.value
                ? parseDateOption(dateOption.value)
                : toIsoDate(new Date());

              rawShowtimes.push(
                ...parseShowtimeText(cinema.name, cinema.slug, date, bodyLines, bookingLinks)
              );
            }
          } catch {
            console.warn(`[yelmo] Failed to scrape ${cinema.slug} — skipping`);
            continue;
          }
        }
      } catch {
        console.warn(`[yelmo] Failed to load ${cityTarget.cityUrl} — skipping city`);
        continue;
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  return {
    chain: "yelmo",
    rawShowtimes,
  };
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
