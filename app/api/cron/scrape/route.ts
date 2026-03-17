import { createServerSupabaseClient } from "@/lib/supabase";
import { jsonResponse } from "@/lib/server-utils";
import type { ApiError } from "@/lib/types";

export const maxDuration = 10;
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return jsonResponse<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: logs, error } = await supabase
      .from("scrape_logs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(6);

    if (error) throw error;

    const { data: stats } = await supabase
      .from("showtimes")
      .select("show_date", { count: "exact", head: true })
      .gte("show_date", new Date().toISOString().slice(0, 10));

    return jsonResponse({
      status: "ok",
      note: "Scrapers run via GitHub Actions (see .github/workflows/scrape.yml). This endpoint is a health check only.",
      recent_scrape_logs: logs ?? [],
      active_showtimes_today: stats,
      checked_at: new Date().toISOString(),
    });
  } catch {
    return jsonResponse<ApiError>({ error: "Health check failed." }, { status: 500 });
  }
}
