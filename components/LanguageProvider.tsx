"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "es" | "en";

type Dictionary = Record<string, { es: string; en: string }>;

const dictionary: Dictionary = {
  nav_films: { es: "Peliculas", en: "Films" },
  nav_top: { es: "Destacadas", en: "Top Picks" },
  nav_privacy: { es: "Privacidad", en: "Privacy" },
  nav_oss: { es: "Codigo abierto", en: "OSS" },
  live_strip: { es: "Sesiones en directo Espana", en: "Live Spain showtimes" },
  hero_eyebrow: { es: "Agregador de cines en Espana", en: "Spain cinema aggregator" },
  hero_title_a: { es: "Encuentra cine en Espana.", en: "Find films across Spain." },
  hero_title_b: { es: "Reserva la sesion correcta.", en: "Book the right session." },
  hero_sub: {
    es: "Compara Cinesa, Yelmo y Kinepolis en un solo lugar con filtros VOSE, enlaces directos de compra y ciudades clave en Espana.",
    en: "Compare Cinesa, Yelmo, and Kinepolis in one place with VOSE filters, direct booking links, and key cities across Spain."
  },
  search: { es: "Buscar", en: "Search" },
  search_placeholder: { es: "Pelicula o cine", en: "Film title or cinema" },
  date: { es: "Fecha", en: "Date" },
  today: { es: "Hoy", en: "Today" },
  tomorrow: { es: "Manana", en: "Tomorrow" },
  day_2: { es: "En 2 dias", en: "In 2 days" },
  day_3: { es: "En 3 dias", en: "In 3 days" },
  city: { es: "Ciudad", en: "City" },
  zone: { es: "Zona", en: "Zone" },
  all_madrid: { es: "Todo Madrid", en: "All Madrid" },
  chains_covered: { es: "Cadenas cubiertas", en: "Chains covered" },
  films_today: { es: "Peliculas hoy", en: "Films today" },
  sessions: { es: "Sesiones", en: "Sessions" },
  vose_sessions: { es: "Sesiones VOSE", en: "VOSE sessions" },
  now_showing: { es: "En cartel", en: "Now Showing" },
  refreshing: { es: "Actualizando...", en: "Refreshing..." },
  no_films: { es: "No se encontraron peliculas", en: "No films found" },
  adjust_filters: { es: "Prueba a cambiar los filtros o la busqueda.", en: "Try adjusting your filters or search." },
  ad_top: { es: "Espacio anuncio superior", en: "Ad slot top" },
  ad_sidebar: { es: "Espacio anuncio lateral", en: "Ad slot sidebar" },
  privacy_title: { es: "Privacidad", en: "Privacy" },
  privacy_subtitle: { es: "sin friccion.", en: "without friction." },
  privacy_copy_1: {
    es: "CineHop no requiere cuentas, no vende datos personales y no guarda IPs en bruto. Los clics de salida se registran con un hash SHA-256 de la IP, el user-agent, el referrer y los identificadores de sesion.",
    en: "CineHop does not require accounts, does not sell personal data, and does not store raw IPs. Outbound clicks are logged with a SHA-256 hash of the IP, user-agent, referrer, and showtime identifiers."
  },
  privacy_copy_2: {
    es: "Estos datos se usan para entender que enlaces de cine funcionan mejor y que formatos reservan realmente los usuarios.",
    en: "This data is used to understand which cinema links perform best and which formats users actually book."
  },
  privacy_copy_3: {
    es: "El almacenamiento local solo se usa para recordar la preferencia del banner de cookies.",
    en: "Local storage is only used to remember the cookie banner preference."
  },
  detail_sessions: { es: "Sesiones disponibles", en: "Available sessions" },
  detail_why: { es: "Por que CineHop", en: "Why CineHop" },
  detail_why_copy: {
    es: "Los enlaces profundos te llevan directo al flujo de compra. Las sesiones VOSE siguen siendo faciles de descubrir. Los precios siguen visibles.",
    en: "Deep links send you straight into the booking flow. VOSE sessions stay easy to discover. Prices stay visible."
  },
  runtime_pending: { es: "Pendiente", en: "Pending" },
  synopsis_pending: { es: "Sinopsis aun no disponible.", en: "Synopsis not yet available." },
  cookie_title: { es: "Privacidad primero", en: "Privacy first" },
  cookie_copy: {
    es: "CineHop no usa cookies publicitarias. Solo registramos clics de salida con una IP hasheada para medir que enlaces funcionan de verdad.",
    en: "CineHop does not use advertising cookies. We only track outbound clicks with a hashed IP to measure which links users actually use."
  },
  accept: { es: "Aceptar", en: "Accept" },
  essential_only: { es: "Solo esencial", en: "Essential only" },
  home: { es: "Inicio", en: "Home" },
  topfilm_fallback: { es: "Seleccion de cine en Espana", en: "Spain cinema picks" },
  cheapest_fallback: { es: "Precios segun scraping", en: "Pricing live as scraped" },
  direct_links: { es: "Enlaces directos", en: "Deep links" },
  price_transparency: { es: "Precio transparente", en: "Price transparency" },
  visible_before_click: { es: "Visible antes del clic", en: "Visible before click" },
  direct_booking_flow: { es: "Directo a la compra", en: "Direct to booking flow" }
};

const STORAGE_KEY = "cinehop-language";

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof dictionary) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (nextLanguage: Language) => {
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
        setLanguageState(nextLanguage);
      },
      t: (key: keyof typeof dictionary) => dictionary[key][language]
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
