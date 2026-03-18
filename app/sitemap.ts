import type { MetadataRoute } from "next";

import { SUPPORTED_CITIES } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date().toISOString();
  const supabase = createServerSupabaseClient();

  const { data: films } = await supabase
    .from("films")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });

  const filmRoutes: MetadataRoute.Sitemap =
    (films as Array<{ slug: string; updated_at: string }> | null)?.map((film) => ({
      url: `${base}/film/${film.slug}`,
      lastModified: film.updated_at,
      changeFrequency: "daily",
      priority: 0.8,
    })) ?? [];

  // City landing pages — high value for local SEO
  const cityRoutes: MetadataRoute.Sitemap = SUPPORTED_CITIES.map((city) => ({
    url: `${base}/${city}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${base}/privacidad`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    ...cityRoutes,
    ...filmRoutes,
  ];
}
