const POSTER_PROXY_PATH = "/api/poster";

export function buildPosterSrc(posterUrl: string | null | undefined): string | null {
  if (!posterUrl) {
    return null;
  }

  return `${POSTER_PROXY_PATH}?url=${encodeURIComponent(posterUrl)}`;
}
