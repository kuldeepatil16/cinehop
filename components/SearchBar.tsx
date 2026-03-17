"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface SearchBarProps {
  query: string;
  date: string;
  zone: string;
  onQueryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchBar({
  query,
  date,
  zone,
  onQueryChange,
  onDateChange,
  onZoneChange,
  onSubmit
}: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <div className="search-shell">
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
          <option value="today">{t("today")}</option>
          <option value="tomorrow">{t("tomorrow")}</option>
        </select>
      </div>
      <div className="search-field">
        <label htmlFor="zone-filter">{t("zone")}</label>
        <select id="zone-filter" value={zone} onChange={(event) => onZoneChange(event.target.value)}>
          <option value="">{t("all_madrid")}</option>
          <option value="centro">Centro</option>
          <option value="norte">Norte</option>
          <option value="sur">Sur</option>
          <option value="este">Este</option>
          <option value="oeste">Oeste</option>
        </select>
      </div>
      <button className="search-button" type="button" onClick={onSubmit}>
        {t("search")}
      </button>
    </div>
  );
}
