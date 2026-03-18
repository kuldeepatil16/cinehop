"use client";

import { CITY_LABELS, SUPPORTED_CITIES } from "@/lib/constants";
import { useLanguage } from "@/components/LanguageProvider";

interface SearchBarProps {
  query: string;
  city: string;
  onQueryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchBar({ query, city, onQueryChange, onCityChange, onSubmit }: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <form
      className="search-shell"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="search-field search-field--grow">
        <label htmlFor="film-search">{t("search")}</label>
        <input
          id="film-search"
          placeholder={t("search_placeholder")}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="search-field">
        <label htmlFor="city-filter">{t("city")}</label>
        <select
          id="city-filter"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
        >
          {SUPPORTED_CITIES.map((c) => (
            <option key={c} value={c}>
              {CITY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <button className="search-button" type="submit">
        {t("search")}
      </button>
    </form>
  );
}
