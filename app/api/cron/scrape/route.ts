import { createServerSupabaseClient } from "@/lib/supabase";
import { jsonResponse } from "@/lib/server-utils";
import type { ApiError } from "@/lib/types";

export const maxDuration = 10;
export const dynamic = "force-dynamic";

// A chain is considered "stale" if its most recent successful scrape is older than this.
const CHAIN_STALE_THRESHOLD_MS = 30 * 60 * 60 * 1000; // 30h = twice-daily cadence plus slack

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return jsonResponse<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Last 3 runs per chain (9 total) for recent history
    const { data: logs, error: logsError } = await supabase
      .from("scrape_logs")
      .select("chain, status, sessions_found, sessions_new, sessions_updated, error_message, duration_ms, ran_at")
      .order("ran_at", { ascending: false })
      .limit(9);

    if (logsError) throw logsError;

    // Per-chain freshness: when was each chain last successfully scraped?
    const chains = ["cinesa", "yelmo", "kinepolis"] as const;
    const staleThreshold = new Date(Date.now() - CHAIN_STALE_THRESHOLD_MS).toISOString();

    const chainHealth = chains.map((chain) => {
      const chainLogs = (logs ?? []).filter((l) => l.chain === chain);
      const lastSuccess = chainLogs.find((l) => l.status === "success");
      const lastRan = chainLogs[0];

      return {
        chain,
        last_success: lastSuccess?.ran_at ?? null,
        last_status: lastRan?.status ?? "never",
        is_stale: !lastSuccess || lastSuccess.ran_at < staleThreshold,
        last_error: chainLogs.find((l) => l.error_message)?.error_message ?? null
      };
    });

    // Active showtime count for today
    const today = new Date().toISOString().slice(0, 10);
    const { count: activeTodayCount } = await supabase
      .from("showtimes")
      .select("id", { count: "exact", head: true })
      .eq("show_date", today)
      .gte("last_seen_at", staleThreshold);

    const overallStale = chainHealth.some((c) => c.is_stale);

    return jsonResponse({
      status: overallStale ? "degraded" : "ok",
      note: "Scrapers run via GitHub Actions twice daily (see .github/workflows/scrape.yml).",
      chain_health: chainHealth,
      active_showtimes_today: activeTodayCount ?? 0,
      stale_threshold: staleThreshold,
      checked_at: new Date().toISOString()
    });
  } catch {
    return jsonResponse<ApiError>({ error: "Health check failed." }, { status: 500 });
  }
}
