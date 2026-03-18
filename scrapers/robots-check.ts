/**
 * Minimal robots.txt checker.
 *
 * Fetches and parses robots.txt for a given origin, then returns whether
 * the given path is allowed for our user-agent.
 *
 * Rules:
 *  - 200: parse and enforce
 *  - 404: no file → everything allowed (per convention)
 *  - Any other error (403, timeout, etc.): log a warning and proceed
 *    (we cannot confirm disallow, so we don't block our own scraper)
 */

import { DEFAULT_USER_AGENT } from "@/lib/constants";

// One entry per origin, shared across all scraper invocations in the same process run.
const cache = new Map<string, string | null>();

async function fetchRobotsTxt(origin: string): Promise<string | null> {
  if (cache.has(origin)) {
    return cache.get(origin) ?? null;
  }

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": DEFAULT_USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      cache.set(origin, null); // no file = allow all
      return null;
    }

    if (!res.ok) {
      console.warn(`[robots] ${origin}/robots.txt returned ${res.status} — proceeding anyway`);
      cache.set(origin, null);
      return null;
    }

    const text = await res.text();
    cache.set(origin, text);
    return text;
  } catch (err) {
    console.warn(`[robots] Could not fetch ${origin}/robots.txt — proceeding anyway`, err);
    cache.set(origin, null);
    return null;
  }
}

/**
 * Returns true if the given path is crawlable according to robots.txt.
 * Matches our User-Agent string first; falls back to the `*` group.
 */
export async function isPathAllowed(origin: string, path: string): Promise<boolean> {
  const txt = await fetchRobotsTxt(origin);
  if (!txt) return true; // 404 or fetch error → allow

  const ourAgent = DEFAULT_USER_AGENT.toLowerCase();
  const lines = txt.split("\n").map((l) => l.trim());

  // Parse into groups: { agents: string[], rules: { allow: string[], disallow: string[] } }
  interface Group {
    agents: string[];
    allow: string[];
    disallow: string[];
  }

  const groups: Group[] = [];
  let current: Group | null = null;

  for (const line of lines) {
    if (line.startsWith("#") || line === "") {
      continue;
    }
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();

    if (key.toLowerCase() === "user-agent") {
      if (!current) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key.toLowerCase() === "disallow") {
      if (current) current.disallow.push(value);
    } else if (key.toLowerCase() === "allow") {
      if (current) current.allow.push(value);
    } else {
      // Any non-rule directive ends the current group
      current = null;
    }
  }

  // Find the most specific matching group (our UA first, then wildcard)
  const matchingGroup =
    groups.find((g) => g.agents.some((a) => ourAgent.includes(a) || a.includes("chrome"))) ??
    groups.find((g) => g.agents.includes("*"));

  if (!matchingGroup) return true;

  // Longer (more specific) rules take precedence
  const applicable = [
    ...matchingGroup.allow.map((r) => ({ allow: true, rule: r })),
    ...matchingGroup.disallow.map((r) => ({ allow: false, rule: r })),
  ]
    .filter(({ rule }) => rule !== "" && path.startsWith(rule))
    .sort((a, b) => b.rule.length - a.rule.length);

  if (applicable.length === 0) return true;
  return applicable[0].allow;
}
