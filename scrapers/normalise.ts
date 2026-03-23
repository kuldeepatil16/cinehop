import { createHash } from "node:crypto";

import type {
  NormalisedShowtime,
  RawShowtime,
  ScrapedFilmCandidate,
  ShowFormat
} from "@/lib/types";

const FORMAT_RULES: Array<{ pattern: RegExp; format: ShowFormat }> = [
  { pattern: /\b(v\.?o\.?s\.?e\.?|vo sub|subtitulada)\b/i, format: "VOSE" },
  { pattern: /\b(vosi|vo int)\b/i, format: "VOSI" },
  { pattern: /\b(v\.?o\.?|versi[oó]n original)\b/i, format: "VO" },
  { pattern: /\b(doblada|espa[nñ]ol|cast\.)\b/i, format: "Doblada" },
  { pattern: /\bimax(?:\s*3d)?\b/i, format: "IMAX" },
  { pattern: /\b4dx(?:3d)?|4d\b/i, format: "4DX" },
  { pattern: /\b3-d\b|\b3d\b/i, format: "3D" },
  { pattern: /\bscreen\s?x\b/i, format: "ScreenX" },
  { pattern: /\bdolby atmos\b|\bdolby cinema\b/i, format: "Dolby" },
  { pattern: /\bmacro\s?xe\b/i, format: "MacroXE" }
];

const LANGUAGE_RULES: Array<{ pattern: RegExp; language: string }> = [
  { pattern: /\bingl[eé]s|english\b/i, language: "en" },
  { pattern: /\bespa[nñ]ol|castellano|cast\.\b/i, language: "es" },
  { pattern: /\bfranc[eé]s|french\b/i, language: "fr" },
  { pattern: /\balem[aá]n|german\b/i, language: "de" },
  { pattern: /\bhindi\b/i, language: "hi" },
  { pattern: /\bjapon[eé]s|japanese\b/i, language: "ja" },
  { pattern: /\bcoreano|korean\b/i, language: "ko" },
  { pattern: /\bportugu[eé]s|portuguese\b/i, language: "pt" },
  { pattern: /\bdan[eé]s|danish\b/i, language: "da" },
  { pattern: /\bnoruego|norwegian\b/i, language: "no" }
];

export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normaliseTitleKey(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[:'".,!?()[\]{}]/g, " ")
    .replace(/\bparte\b/g, "part")
    .replace(/\bdos\b/g, "two")
    .replace(/\btres\b/g, "three")
    .replace(/\bii\b/g, "2")
    .replace(/\biii\b/g, "3")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normaliseTitleKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normaliseFormat(rawFormat: string): ShowFormat {
  const value = rawFormat.trim();

  for (const rule of FORMAT_RULES) {
    if (rule.pattern.test(value)) {
      return rule.format;
    }
  }

  return "Doblada";
}

export function inferLanguage(rawValue: string, format: ShowFormat): string | null {
  for (const rule of LANGUAGE_RULES) {
    if (rule.pattern.test(rawValue)) {
      return rule.language;
    }
  }

  if (format === "Doblada") {
    return "es";
  }

  if (format === "VOSE" || format === "VO" || format === "VOSI") {
    return "en";
  }

  return null;
}

export function parseEuroPrice(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalised = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const price = Number.parseFloat(normalised);

  return Number.isFinite(price) ? price : null;
}

export function computeSourceHash(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

export function buildSourceHash(
  cinemaId: string,
  filmTitle: string,
  showDate: string,
  showTime: string,
  format: ShowFormat
): string {
  return computeSourceHash(`${cinemaId}${filmTitle}${showDate}${showTime}${format}`);
}

export function normaliseShowtime(raw: RawShowtime, cinemaId: string): NormalisedShowtime {
  const format = normaliseFormat(`${raw.raw_format} ${raw.raw_language ?? ""}`);
  const language = inferLanguage(`${raw.raw_language ?? ""} ${raw.raw_format}`, format);

  return {
    film_title: raw.film_title.trim(),
    film_title_es: raw.film_title_es?.trim() ?? null,
    poster_url: raw.poster_url ?? null,
    backdrop_url: raw.backdrop_url ?? null,
    cinema_slug: raw.cinema_slug,
    chain: raw.chain,
    show_date: raw.show_date,
    show_time: raw.show_time,
    format,
    language,
    is_vose: format === "VOSE" || format === "VO" || format === "VOSI",
    price_eur: raw.price_eur,
    booking_url: raw.booking_url,
    source_hash: buildSourceHash(cinemaId, raw.film_title, raw.show_date, raw.show_time, format)
  };
}

export function collectFilmCandidates(showtimes: RawShowtime[]): ScrapedFilmCandidate[] {
  const byKey = new Map<string, ScrapedFilmCandidate>();

  for (const showtime of showtimes) {
    const key = normaliseTitleKey(showtime.film_title);

    if (!byKey.has(key)) {
      byKey.set(key, {
        title: showtime.film_title,
        title_es: showtime.film_title_es ?? null,
        poster_url: showtime.poster_url ?? null,
        backdrop_url: showtime.backdrop_url ?? null
      });
    }
  }

  return [...byKey.values()];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function randomDelay(min = 1000, max = 3000): Promise<void> {
  const duration = Math.floor(Math.random() * (max - min + 1)) + min;
  await delay(duration);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function extractTimes(text: string): string[] {
  return Array.from(text.matchAll(/\b(\d{1,2}:\d{2})\b/g), (match) => match[1]);
}
