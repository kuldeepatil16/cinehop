import { API_CACHE_HEADERS, getFilmsForDate } from "@/lib/queries";
import { jsonResponse } from "@/lib/server-utils";
import type { ApiError, FilmsApiParams, FilmsApiResponse } from "@/lib/types";

function getList(searchParams: URLSearchParams, key: string): string[] | undefined {
  const values = searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const params: FilmsApiParams = {
    date: searchParams.get("date") ?? undefined,
    city: (searchParams.get("city") ?? undefined) as FilmsApiParams["city"],
    vose: searchParams.get("vose") ?? undefined,
    format: getList(searchParams, "format") as FilmsApiParams["format"],
    chain: getList(searchParams, "chain") as FilmsApiParams["chain"],
    zone: (searchParams.get("zone") ?? undefined) as FilmsApiParams["zone"],
    q: searchParams.get("q") ?? undefined,
    price_max: searchParams.get("price_max") ?? undefined,
    language: getList(searchParams, "language") as FilmsApiParams["language"]
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
