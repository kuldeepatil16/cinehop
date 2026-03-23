import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "m.media-amazon.com",
  "ia.media-imdb.com",
  "img.omdbapi.com",
  "image.tmdb.org",
  "cdn.kinepolis.es"
]);

function buildFallbackSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" role="img" aria-label="Poster unavailable">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#151515" />
          <stop offset="100%" stop-color="#3b1b15" />
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill="url(#bg)" rx="28" />
      <circle cx="92" cy="98" r="18" fill="#e8391d" opacity="0.95" />
      <path d="M80 222h240M80 278h186M80 334h214" stroke="#f5f2ec" stroke-width="18" stroke-linecap="round" opacity="0.92" />
      <text x="80" y="470" fill="#f5f2ec" font-family="Arial, sans-serif" font-size="32" letter-spacing="5">CINEHOP</text>
      <text x="80" y="514" fill="#c9a84c" font-family="Arial, sans-serif" font-size="24" letter-spacing="4">POSTER UNAVAILABLE</text>
    </svg>
  `.trim();
}

function fallbackResponse(): NextResponse {
  return new NextResponse(buildFallbackSvg(), {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600"
    }
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return fallbackResponse();
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return fallbackResponse();
  }

  if (!["http:", "https:"].includes(parsed.protocol) || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return fallbackResponse();
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      },
      next: { revalidate: 60 * 60 * 6 }
    });

    if (!upstream.ok) {
      return fallbackResponse();
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=21600"
      }
    });
  } catch {
    return fallbackResponse();
  }
}
