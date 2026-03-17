"use client";

import { FILTER_PILLS } from "@/lib/constants";

interface FilterBarProps {
  activeFilters: Set<string>;
  onToggle: (value: string) => void;
}

export function FilterBar({ activeFilters, onToggle }: FilterBarProps) {
  return (
    <div className="filter-row">
      {FILTER_PILLS.map((pill) => (
        <button
          key={pill.id}
          className={`pill ${"prominent" in pill && pill.prominent ? "prominent" : ""} ${activeFilters.has(pill.id) ? "active" : ""}`}
          type="button"
          onClick={() => onToggle(pill.id)}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
