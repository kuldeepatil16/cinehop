"use client";

import { useMemo, useState, useTransition } from "react";

import { FilterBar } from "@/components/FilterBar";
import { FilmGrid } from "@/components/FilmGrid";
import { SearchBar } from "@/components/SearchBar";
import { SessionModal } from "@/components/SessionModal";
import { StatBar } from "@/components/StatBar";
import { Ticker } from "@/components/Ticker";
import { useLanguage } from "@/components/LanguageProvider";
import { CITY_LABELS, SUPPORTED_CITIES } from "@/lib/constants";
import type { City, FilmCardData, FilmsApiResponse } from "@/lib/types";

interface HomepageClientProps {
  initialData: FilmsApiResponse;
}

function getDateOptions(
  t: (key: "today" | "tomorrow" | "day_2" | "day_3") => string
): Array<{ value: string; label: string }> {
  return [0, 1, 2, 3].map((offset) => {
    if (offset === 0) {
      return { value: "today", label: t("today") };
    }

    if (offset === 1) {
      return { value: "tomorrow", label: t("tomorrow") };
    }

    const dateValue = new Date();
    dateValue.setDate(dateValue.getDate() + offset);

    return {
      value: dateValue.toISOString().slice(0, 10),
      label: t(offset === 2 ? "day_2" : "day_3")
    };
  });
}

export function HomepageClient({ initialData }: HomepageClientProps) {
  const { t } = useLanguage();
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("today");
  const [city, setCity] = useState<City>("madrid");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["vose"]));
  const [selectedFilm, setSelectedFilm] = useState<FilmCardData | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateOptions = useMemo(() => getDateOptions(t), [t]);
  const cheapestSession = useMemo(() => {
    const prices = data.films.flatMap((film) =>
      film.showtimes.map((showtime) => showtime.price_eur).filter((value): value is number => value !== null)
    );

    if (prices.length === 0) {
      return t("cheapest_fallback");
    }

    return `€${Math.min(...prices).toFixed(2)} in ${CITY_LABELS[city]}`;
  }, [city, data.films, t]);

  function buildParams(overrideFilters?: Set<string>, overrideDate?: string, overrideCity?: City): URLSearchParams {
    const filters = overrideFilters ?? activeFilters;
    const nextDate = overrideDate ?? date;
    const nextCity = overrideCity ?? city;
    const params = new URLSearchParams();

    params.set("date", nextDate);
    params.set("city", nextCity);

    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (filters.has("vose")) {
      params.set("vose", "true");
    }
    if (filters.has("vo")) {
      params.set("format", "VO");
    }
    if (filters.has("imax")) {
      params.set("format", "IMAX");
    }
    if (filters.has("4dx")) {
      params.set("format", "4DX");
    }
    if (filters.has("3d")) {
      params.set("format", "3D");
    }
    if (filters.has("screenx")) {
      params.set("format", "ScreenX");
    }
    if (filters.has("cinesa")) {
      params.set("chain", "cinesa");
    }
    if (filters.has("yelmo")) {
      params.set("chain", "yelmo");
    }
    if (filters.has("kinepolis")) {
      params.set("chain", "kinepolis");
    }
    if (filters.has("lang-en")) {
      params.set("language", "en");
    }
    if (filters.has("lang-es")) {
      params.set("language", "es");
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

  return (
    <>
      <Ticker
        filmCount={data.stats.film_count}
        sessionCount={data.stats.session_count}
        voseCount={data.stats.vose_count}
        cheapestSession={cheapestSession}
        topFilm={data.films[0]?.title ?? t("topfilm_fallback")}
      />
      <StatBar
        filmCount={data.stats.film_count}
        sessionCount={data.stats.session_count}
        voseCount={data.stats.vose_count}
      />
      <main className="main-content cine-container">
        <div className="mb-6" id="ad-slot-top">
          <div className="ad-slot">Ad slot top</div>
        </div>
        <SearchBar
          query={query}
          date={date}
          city={city}
          dateOptions={dateOptions}
          onQueryChange={setQuery}
          onDateChange={handleDateChange}
          onCityChange={handleCityChange}
          onSubmit={reload}
        />
        <FilterBar activeFilters={activeFilters} onToggle={toggleFilter} />
        <div className="section-header">
          <span className="section-title">{isPending ? t("refreshing") : t("now_showing")}</span>
          <span className="section-count">
            {data.stats.film_count} films · {data.stats.session_count} sessions
          </span>
        </div>
        <FilmGrid films={data.films} onOpen={setSelectedFilm} />
      </main>
      <SessionModal film={selectedFilm} onClose={() => setSelectedFilm(null)} />
    </>
  );
}
