"use client";

const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"] as const;
const DAYS   = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"] as const;

export interface DateOption {
  value: string;   // "today" | "tomorrow" | "YYYY-MM-DD"
  dayLabel: string; // "HOY" | "MAN" | "JUE"
  dayNum: string;   // "18"
  monthLabel: string; // "MAR"
}

export function buildDateOptions(days = 4): DateOption[] {
  return Array.from({ length: days }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);

    const value =
      offset === 0 ? "today"
      : offset === 1 ? "tomorrow"
      : d.toISOString().slice(0, 10);

    const dayLabel =
      offset === 0 ? "HOY"
      : offset === 1 ? "MAN"
      : DAYS[d.getDay()];

    return {
      value,
      dayLabel,
      dayNum: String(d.getDate()).padStart(2, "0"),
      monthLabel: MONTHS[d.getMonth()],
    };
  });
}

interface DateBarProps {
  selected: string;
  options: DateOption[];
  onChange: (value: string) => void;
}

export function DateBar({ selected, options, onChange }: DateBarProps) {
  return (
    <div className="date-bar" role="group" aria-label="Seleccionar fecha">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`date-pill${selected === opt.value ? " active" : ""}`}
          aria-pressed={selected === opt.value}
          onClick={() => onChange(opt.value)}
        >
          <span className="date-pill-day">{opt.dayLabel}</span>
          <span className="date-pill-num">{opt.dayNum}</span>
          <span className="date-pill-month">{opt.monthLabel}</span>
        </button>
      ))}
    </div>
  );
}
