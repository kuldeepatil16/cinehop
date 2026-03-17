import { hashIp, jsonResponse } from "@/lib/server-utils";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { ApiError, TrackPayload, TrackResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as TrackPayload;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() ?? "0.0.0.0";
    const userAgent = request.headers.get("user-agent");
    const referrer = request.headers.get("referer");

    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from("click_events").insert({
      showtime_id: payload.showtime_id,
      cinema_chain: payload.cinema_chain,
      film_slug: payload.film_slug,
      session_format: payload.session_format,
      user_ip: hashIp(ip),
      user_agent: userAgent,
      referrer
    });

    if (error) {
      throw error;
    }

    return jsonResponse<TrackResponse>({ ok: true });
  } catch {
    return jsonResponse<ApiError>({ error: "Unable to record click." }, { status: 500 });
  }
}
