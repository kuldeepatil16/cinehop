import type { Chain, Zone } from "./types";

export const SITE_NAME = "CineHop";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const CITY = {
  name: "Madrid",
  country: "ES",
  timezone: "Europe/Madrid",
} as const;
export const MADRID_TIMEZONE = CITY.timezone;
export const SPAIN_LOCALE = "es-ES";
export const DEFAULT_CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=60";
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

export const CHAINS: Record<Chain, { label: string; slug: Chain }> = {
  cinesa: { label: "Cinesa", slug: "cinesa" },
  yelmo: { label: "Yelmo Cines", slug: "yelmo" },
  kinepolis: { label: "Kinepolis", slug: "kinepolis" },
};
export const CHAIN_LABELS: Record<Chain, string> = {
  cinesa: "Cinesa",
  yelmo: "Yelmo",
  kinepolis: "Kinepolis",
};

export const CHAIN_TARGETS: Record<Chain, { root: string; showtimes: string }> = {
  cinesa: { root: "https://www.cinesa.es", showtimes: "https://www.cinesa.es/cines/" },
  yelmo: { root: "https://yelmocines.es", showtimes: "https://yelmocines.es/cartelera/madrid" },
  kinepolis: { root: "https://kinepolis.es", showtimes: "https://kinepolis.es/carteleras/madrid" },
};
export const CHAIN_URLS: Record<Chain, string> = {
  cinesa: CHAIN_TARGETS.cinesa.showtimes,
  yelmo: CHAIN_TARGETS.yelmo.showtimes,
  kinepolis: CHAIN_TARGETS.kinepolis.showtimes,
};

export const SCRAPE_CONFIG = {
  minDelayMs: 1000,
  maxDelayMs: 3000,
  days: 2, // today + tomorrow minimum; increase to 7 when the chain pages allow it cheaply
  navigationTimeoutMs: 45_000,
  selectorTimeoutMs: 20_000,
} as const;

// A small UA pool is enough; the goal is "not a bot default".
export const USER_AGENTS: readonly string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

export const MADRID_ZONES: readonly Zone[] = ["centro", "norte", "sur", "este", "oeste"];

// Cinema slugs we seed and expect scrapers to produce.
export const MADRID_CINEMA_SLUGS: Record<Chain, readonly string[]> = {
  cinesa: [
    "cinesa-la-gavia",
    "cinesa-manoteras",
    "cinesa-mendez-alvaro",
    "cinesa-nassica",
    "cinesa-parquesur",
    "cinesa-principe-pio",
    "cinesa-proyecciones",
    "cinesa-las-rosas",
    "cinesa-la-moraleja",
  ],
  yelmo: [
    "yelmo-ideal",
    "yelmo-islazul",
    "yelmo-la-vaguada",
    "yelmo-plenilunio",
    "yelmo-planetocio",
    "yelmo-rivas-h2o",
    "yelmo-tres-aguas",
    "yelmo-plaza-norte",
  ],
  kinepolis: ["kinepolis-madrid"],
};
export const MADRID_CINESA_TARGETS = MADRID_CINEMA_SLUGS.cinesa;
export const MADRID_YELMO_TARGETS = MADRID_CINEMA_SLUGS.yelmo;
export const MADRID_KINEPOLIS_TARGETS = MADRID_CINEMA_SLUGS.kinepolis;

export const OMDB = {
  baseUrl: "https://www.omdbapi.com/",
} as const;
export const OMDB_API_URL = OMDB.baseUrl;

export const HOMEPAGE_META = {
  title: "CineHop — Películas en Madrid hoy | Cartelera de cine",
  description:
    "Encuentra todas las sesiones de cine en Madrid — Cinesa, Yelmo y Kinepolis. Filtros VOSE, IMAX, 4DX y precios. Sin sorpresas.",
};

export const FILTER_PILLS = [
  { id: "vose", label: "VOSE First", value: "VOSE", prominent: true },
  { id: "vo", label: "VO", value: "VO" },
  { id: "imax", label: "IMAX", value: "IMAX" },
  { id: "4dx", label: "4DX", value: "4DX" },
  { id: "3d", label: "3D", value: "3D" },
  { id: "screenx", label: "ScreenX", value: "ScreenX" },
  { id: "cinesa", label: "Cinesa", value: "cinesa" },
  { id: "yelmo", label: "Yelmo", value: "yelmo" },
  { id: "kinepolis", label: "Kinepolis", value: "kinepolis" },
  { id: "price", label: "Under €9", value: "price" },
] as const;

export const FOOTER_COPY =
  "CineHop Madrid · Data refreshed every 2h · Not affiliated with any cinema chain";
