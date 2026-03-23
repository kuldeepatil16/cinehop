"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { DateBar, buildDateOptions } from "@/components/DateBar";
import { FilterBar } from "@/components/FilterBar";
import { FilmGrid } from "@/components/FilmGrid";
import { SearchBar } from "@/components/SearchBar";
import { SessionModal } from "@/components/SessionModal";
import { StatBar } from "@/components/StatBar";
import { Ticker } from "@/components/Ticker";
import { useLanguage } from "@/components/LanguageProvider";
import { CITY_LABELS, SCRAPE_CONFIG, SUPPORTED_CITIES } from "@/lib/constants";
import type { City, FilmCardData, FilmsApiResponse } from "@/lib/types";

interface HomepageClientProps {
  initialData: FilmsApiResponse;
  initialCity?: City;
}

export function HomepageClient({ initialData, initialCity = "madrid" }: HomepageClientProps) {
  const { language, t } = useLanguage();
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("today");
  const [city, setCity] = useState<City>(initialCity);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [selectedFilm, setSelectedFilm] = useState<FilmCardData | null>(initialData.films[0] ?? null);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateOptions = useMemo(() => buildDateOptions(SCRAPE_CONFIG.days), []);
  const cheapestSession = useMemo(() => {
    const prices = data.films.flatMap((film) =>
      film.showtimes.map((showtime) => showtime.price_eur).filter((value): value is number => value !== null)
    );

    if (prices.length === 0) {
      return t("cheapest_fallback");
    }

    return `EUR${Math.min(...prices).toFixed(2)} in ${CITY_LABELS[city]}`;
  }, [city, data.films, t]);

  const rankedFilms = useMemo(() => {
    return [...data.films].sort((left, right) => {
      const leftScore =
        (left.rating ?? 0) * 100 +
        left.totalSessions * 3 +
        (left.formats.includes("VOSE") ? 12 : 0) +
        (left.formats.includes("VOSI") ? 8 : 0);
      const rightScore =
        (right.rating ?? 0) * 100 +
        right.totalSessions * 3 +
        (right.formats.includes("VOSE") ? 12 : 0) +
        (right.formats.includes("VOSI") ? 8 : 0);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.title.localeCompare(right.title);
    });
  }, [data.films]);

  useEffect(() => {
    setSelectedFilm((current) => {
      if (rankedFilms.length === 0) {
        return null;
      }

      if (!current) {
        return rankedFilms[0];
      }

      return rankedFilms.find((film) => film.id === current.id) ?? rankedFilms[0];
    });
  }, [rankedFilms]);

  function buildParams(
    overrideFilters?: Set<string>,
    overrideDate?: string,
    overrideCity?: City,
    overrideQuery?: string
  ): URLSearchParams {
    const filters = overrideFilters ?? activeFilters;
    const nextDate = overrideDate ?? date;
    const nextCity = overrideCity ?? city;
    // overrideQuery lets callers pass the latest typed value before React re-renders
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const params = new URLSearchParams();

    params.set("date", nextDate);
    params.set("city", nextCity);

    if (q.trim()) {
      params.set("q", q.trim());
    }
    if (filters.has("vose")) {
      params.set("vose", "true");
    }

    const formatMap = new Map<string, string>([
      ["vosi", "VOSI"],
      ["vo", "VO"],
      ["imax", "IMAX"],
      ["4dx", "4DX"],
      ["3d", "3D"],
      ["screenx", "ScreenX"]
    ]);
    for (const [filterId, format] of formatMap) {
      if (filters.has(filterId)) {
        params.append("format", format);
      }
    }

    const chainFilters = ["cinesa", "yelmo", "kinepolis"] as const;
    for (const chain of chainFilters) {
      if (filters.has(chain)) {
        params.append("chain", chain);
      }
    }

    const languageMap = new Map<string, string>([
      ["lang-en", "en"],
      ["lang-es", "es"],
      ["lang-hi", "hi"]
    ]);
    for (const [filterId, language] of languageMap) {
      if (filters.has(filterId)) {
        params.append("language", language);
      }
    }

    if (filters.has("price")) {
      params.set("price_max", "9");
    }

    return params;
  }

  function fetchFilms(params: URLSearchParams): void {
    startTransition(async () => {
      const response = await fetch(`/api/films?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const nextData = (await response.json()) as FilmsApiResponse;
      setData(nextData);
    });
  }

  function reload(): void {
    fetchFilms(buildParams());
  }

  function toggleFilter(filter: string): void {
    const next = new Set(activeFilters);
    if (next.has(filter)) {
      next.delete(filter);
    } else {
      next.add(filter);
    }
    setActiveFilters(next);
    fetchFilms(buildParams(next));
  }

  function handleDateChange(value: string): void {
    setDate(value);
    fetchFilms(buildParams(undefined, value));
  }

  function handleCityChange(value: string): void {
    const nextCity = SUPPORTED_CITIES.includes(value as City) ? (value as City) : "madrid";
    setCity(nextCity);
    fetchFilms(buildParams(undefined, undefined, nextCity));
  }

  function handleQueryChange(value: string): void {
    setQuery(value);
    // Debounced live search: fires 400 ms after the user stops typing.
    // We pass the value explicitly so we don't depend on the state update
    // having already committed (avoids stale-closure misses).
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchFilms(buildParams(undefined, undefined, undefined, value));
    }, 400);
  }

  return (
    <>
      <Ticker
        filmCount={data.stats.film_count}
        sessionCount={data.stats.session_count}
        voseCount={data.stats.vose_count}
        cheapestSession={cheapestSession}
        topFilm={rankedFilms[0]?.title ?? t("topfilm_fallback")}
      />
      <StatBar
        filmCount={data.stats.film_count}
        sessionCount={data.stats.session_count}
        voseCount={data.stats.vose_count}
      />
      <main className="main-content cine-container">
        <section className="discovery-shell">
          <div className="discovery-header">
            <div className="section-kicker">{t("discovery_live")}</div>
            <p className="discovery-copy">{t("discovery_copy")}</p>
          </div>
          <SearchBar
            query={query}
            city={city}
            onQueryChange={handleQueryChange}
            onCityChange={handleCityChange}
            onSubmit={reload}
          />
          <DateBar
            selected={date}
            options={dateOptions}
            onChange={handleDateChange}
          />
          <FilterBar activeFilters={activeFilters} onToggle={toggleFilter} />
        </section>
        {selectedFilm ? <SessionModal film={selectedFilm} /> : null}
        <div className="section-header">
          <div>
            <div className="section-kicker">{t("now_showing")}</div>
            <span className="section-title">
              {isPending ? t("refreshing") : t("recommended_movies")}
            </span>
            <p className="section-copy">{t("booking_board_copy")}</p>
          </div>
          <span className="section-count">
            {language === "es"
              ? `${data.stats.film_count} peliculas / ${data.stats.session_count} sesiones`
              : `${data.stats.film_count} films / ${data.stats.session_count} sessions`}
          </span>
        </div>
        <FilmGrid
          films={rankedFilms}
          onOpen={setSelectedFilm}
          selectedFilmId={selectedFilm?.id ?? null}
          hasActiveFilters={activeFilters.size > 0 || query.trim().length > 0}
        />
      </main>
    </>
  );
}
