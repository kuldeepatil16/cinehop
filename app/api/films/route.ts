import { API_CACHE_HEADERS, getFilmsForDate } from "@/lib/queries";
import { jsonResponse } from "@/lib/server-utils";
import type { ApiError, FilmsApiParams, FilmsApiResponse } from "@/lib/types";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const params: FilmsApiParams = {
    date: searchParams.get("date") ?? undefined,
    vose: searchParams.get("vose") ?? undefined,
    format: (searchParams.get("format") ?? undefined) as FilmsApiParams["format"],
    chain: (searchParams.get("chain") ?? undefined) as FilmsApiParams["chain"],
    zone: (searchParams.get("zone") ?? undefined) as FilmsApiParams["zone"],
    q: searchParams.get("q") ?? undefined,
    price_max: searchParams.get("price_max") ?? undefined
  };

  try {
    const data = await getFilmsForDate(params);
    return jsonResponse<FilmsApiResponse>(data, {
      headers: API_CACHE_HEADERS
    });
  } catch {
    return jsonResponse<ApiError>({ error: "Unable to load films." }, { status: 500 });
  }
}
