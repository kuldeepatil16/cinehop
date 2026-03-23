"use client";

import type { MouseEvent } from "react";

import type { Chain, ShowFormat } from "@/lib/types";

interface TimeButtonProps {
  href: string | null;
  label: string;
  price?: number | null;
  showtimeId: string;
  chain: Chain;
  filmSlug: string;
  format: ShowFormat;
  showFormat?: boolean;
}

export function TimeButton({
  href,
  label,
  price,
  showtimeId,
  chain,
  filmSlug,
  format,
  showFormat = false
}: TimeButtonProps) {
  function handleClick(_: MouseEvent<HTMLAnchorElement>): void {
    if (!href) return;

    const payload = JSON.stringify({
      showtime_id: showtimeId,
      cinema_chain: chain,
      film_slug: filmSlug,
      session_format: format
    });

    void fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: payload
    }).catch(() => {
      // Fire-and-forget analytics only.
    });
  }

  return (
    <a
      className={`time-pill ${showFormat ? "time-pill--booking" : ""}`}
      href={href ?? "#"}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
    >
      <span className="time-pill-label">{label}</span>
      {showFormat ? <span className="time-pill-format">{format}</span> : null}
      {price !== null && price !== undefined ? <span className="price-chip">EUR{price.toFixed(2)}</span> : null}
    </a>
  );
}
