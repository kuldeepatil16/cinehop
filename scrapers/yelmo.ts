import { chromium } from "playwright";

import { DEFAULT_USER_AGENT, MADRID_TIMEZONE, SPAIN_LOCALE, CHAIN_TARGETS } from "@/lib/constants";
import type { ChainScrapePayload, RawShowtime } from "@/lib/types";
import { extractTimes, parseEuroPrice, randomDelay, toIsoDate } from "@/scrapers/normalise";
import { isPathAllowed } from "@/scrapers/robots-check";

const YELMO_CINEMAS = [
  { value: "ideal", slug: "yelmo-ideal", name: "Yelmo Ideal" },
  { value: "islazul", slug: "yelmo-islazul", name: "Yelmo Islazul" },
  { value: "la-vaguada", slug: "yelmo-la-vaguada", name: "Yelmo La Vaguada" },
  { value: "plenilunio", slug: "yelmo-plenilunio", name: "Yelmo Plenilunio" },
  { value: "planetocio", slug: "yelmo-planetocio", name: "Yelmo Planetocio" },
  { value: "rivas-h2o", slug: "yelmo-rivas-h2o", name: "Yelmo Rivas H2O" },
  { value: "tres-aguas", slug: "yelmo-tres-aguas", name: "Yelmo Tres Aguas" },
  { value: "plaza-norte-2", slug: "yelmo-plaza-norte", name: "Yelmo Plaza Norte" }
] as const;

// Noise lines to skip when parsing body text
const NOISE_PATTERN = /^(Cartelera|Horarios|Formato|Idioma|Experiencia|Día|VOLVER ARRIBA|Estreno|Yelmo|yelmocines|Madrid|Cookies|Aviso Legal|Política|Ver más|Comprar|TP|M-|PDC|\+18|NR|MADRID)/i;

/**
 * Parses the body text of the currently-selected Yelmo cinema page.
 * After selecting a cinema via the #ddlCinema dropdown, the page body
 * contains only that cinema's schedule — no section-level filtering is needed.
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
    // Skip navigation/header/footer/age-rating noise
    if (NOISE_PATTERN.test(line) || line.length < 2) {
      continue;
    }

    // Time slot line: one or more HH:MM tokens
    if (/^\d{1,2}:\d{2}/.test(line)) {
      const times = extractTimes(line);
      for (const time of times) {
        // Try to align booking link by matching the time text; fall back to sequential
        const booking = bookingLinks.find((l, i) => i >= linkIndex && l.time === time) ??
          bookingLinks[linkIndex];
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
          booking_url: booking?.href ?? null
        });
        linkIndex += 1;
      }
      continue;
    }

    // Format / language label
    if (/\b(VOSE|VOSI|VO\b|3D|IMAX|4DX|ScreenX|Dolby|Doblada|ESPAÑOL|SUBTITUL)/i.test(line)) {
      currentLanguage = line;
      continue;
    }

    // Everything else that isn't pure whitespace or a number is treated as a film title
    if (line && !/^\d+$/.test(line)) {
      currentFilm = line;
    }
  }

  return results.filter((item) => item.film_title);
}

export async function scrapeYelmo(): Promise<ChainScrapePayload> {
  const root = CHAIN_TARGETS.yelmo.root;
  if (!await isPathAllowed(root, "/cartelera/madrid")) {
    console.warn("[yelmo] robots.txt disallows /cartelera/madrid — skipping");
    return { chain: "yelmo", rawShowtimes: [] };
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
    await page.goto("https://yelmocines.es/cartelera/madrid", {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    // Dismiss cookie banner if present
    await page.getByRole("button", { name: /Permitir todas|Aceptar/i }).click({ timeout: 10000 }).catch(() => undefined);
    await randomDelay(1000, 2000);

    for (const cinema of YELMO_CINEMAS) {
      try {
        // Select the cinema from the dropdown
        await page.selectOption("#ddlCinema", cinema.value);
        // Wait for the page to update its schedule content
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
        await randomDelay(800, 1500);

        // Read up to 2 dates (today + tomorrow)
        const dateOptions = await page.locator("#ddlDate option").evaluateAll((nodes) =>
          nodes
            .map((node) => ({
              text: node.textContent?.trim() ?? "",
              value: (node as HTMLOptionElement).value
            }))
            .filter((node) => node.value && node.value !== "0")
            .slice(0, 2)
        );

        const datesToScrape = dateOptions.length > 0 ? dateOptions : [{ text: "", value: "" }];

        for (const dateOption of datesToScrape) {
          if (dateOption.value) {
            await page.selectOption("#ddlDate", dateOption.value).catch(() => undefined);
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
            await randomDelay(800, 1500);
          }

          // Collect booking links (anchor tags whose text is a time, e.g. "16:10")
          const bookingLinks = await page.locator("a").evaluateAll((nodes) =>
            nodes
              .map((node) => ({
                time: (node.textContent ?? "").trim(),
                href: (node as HTMLAnchorElement).href
              }))
              .filter((node) => /^\d{1,2}:\d{2}$/.test(node.time))
          );

          const bodyText = await page.locator("body").innerText();
          const bodyLines = bodyText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

          // Derive an ISO date string from the dropdown value, falling back to today
          let date: string;
          if (dateOption.value) {
            // Yelmo typically passes dates as "YYYY-MM-DD" or "DD/MM/YYYY" — handle both
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateOption.value)) {
              date = dateOption.value;
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOption.value)) {
              const [day, month, year] = dateOption.value.split("/");
              date = `${year}-${month}-${day}`;
            } else {
              // Treat value as a ms-since-epoch or ISO string
              const parsed = new Date(dateOption.value);
              date = Number.isNaN(parsed.getTime()) ? toIsoDate(new Date()) : toIsoDate(parsed);
            }
          } else {
            date = toIsoDate(new Date());
          }

          rawShowtimes.push(...parseShowtimeText(cinema.name, cinema.slug, date, bodyLines, bookingLinks));
        }
      } catch {
        continue;
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  return {
    chain: "yelmo",
    rawShowtimes
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
