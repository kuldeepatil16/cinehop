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
}

export function TimeButton({ href, label, price, showtimeId, chain, filmSlug, format }: TimeButtonProps) {
  function handleClick(_: MouseEvent<HTMLAnchorElement>): void {
    if (!href) return;

    const payload = JSON.stringify({
      showtime_id: showtimeId,
      cinema_chain: chain,
      film_slug: filmSlug,
      session_format: format,
    });

    // Use keepalive fetch — works reliably with JSON content-type
    // sendBeacon doesn't support custom headers so we use fetch with keepalive instead
    void fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: payload,
    }).catch(() => {
      // Fire and forget — never block the navigation
    });
  }

  return (
    <a className="time-pill" href={href ?? "#"} target="_blank" rel="noreferrer" onClick={handleClick}>
      <span>{label}</span>
      {price !== null && price !== undefined ? <span className="price-chip">€{price.toFixed(2)}</span> : null}
    </a>
  );
}
