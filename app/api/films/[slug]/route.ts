import { API_CACHE_HEADERS, getFilmBySlug } from "@/lib/queries";
import { jsonResponse } from "@/lib/server-utils";
import type { ApiError, FilmApiResponse } from "@/lib/types";

interface Params {
  params: {
    slug: string;
  };
}

export async function GET(_: Request, { params }: Params): Promise<Response> {
  try {
    const data = await getFilmBySlug(params.slug);

    if (!data) {
      return jsonResponse<ApiError>({ error: "Film not found." }, { status: 404 });
    }

    return jsonResponse<FilmApiResponse>(data, {
      headers: API_CACHE_HEADERS
    });
  } catch {
    return jsonResponse<ApiError>({ error: "Unable to load film." }, { status: 500 });
  }
}
