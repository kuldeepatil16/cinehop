"use client";

import { Fragment } from "react";

import { FILTER_GROUPS } from "@/lib/constants";

interface FilterBarProps {
  activeFilters: Set<string>;
  onToggle: (id: string) => void;
}

export function FilterBar({ activeFilters, onToggle }: FilterBarProps) {
  return (
    <div className="filter-row">
      {FILTER_GROUPS.map((group, groupIndex) => (
        <Fragment key={group.id}>
          {groupIndex > 0 && <span className="filter-sep" aria-hidden />}
          <div className="filter-group">
            <span className="filter-group-label">{group.label}</span>
            {group.pills.map((pill) => (
              <button
                key={pill.id}
                className={`pill ${"prominent" in pill && pill.prominent ? "prominent" : ""} ${activeFilters.has(pill.id) ? "active" : ""}`}
                type="button"
                aria-pressed={activeFilters.has(pill.id)}
                onClick={() => onToggle(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
