"use client";

import { CITY_LABELS, SUPPORTED_CITIES } from "@/lib/constants";
import { useLanguage } from "@/components/LanguageProvider";

interface SearchBarProps {
  query: string;
  date: string;
  city: string;
  dateOptions: Array<{ value: string; label: string }>;
  onQueryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchBar({
  query,
  date,
  city,
  dateOptions,
  onQueryChange,
  onDateChange,
  onCityChange,
  onSubmit
}: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <form
      className="search-shell"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="search-field">
        <label htmlFor="film-search">{t("search")}</label>
        <input
          id="film-search"
          placeholder={t("search_placeholder")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="search-field">
        <label htmlFor="date-filter">{t("date")}</label>
        <select id="date-filter" value={date} onChange={(event) => onDateChange(event.target.value)}>
          {dateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="search-field">
        <label htmlFor="city-filter">{t("city")}</label>
        <select id="city-filter" value={city} onChange={(event) => onCityChange(event.target.value)}>
          {SUPPORTED_CITIES.map((supportedCity) => (
            <option key={supportedCity} value={supportedCity}>
              {CITY_LABELS[supportedCity]}
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
