import type { MetadataRoute } from "next";

import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("films").select("slug, updated_at").order("updated_at", { ascending: false });

  const filmRoutes =
    (data as Array<{ slug: string; updated_at: string }> | null)?.map((film) => ({
      url: `${base}/film/${film.slug}`,
      lastModified: film.updated_at
    })) ?? [];

  return [
    {
      url: `${base}/`,
      lastModified: new Date().toISOString()
    },
    {
      url: `${base}/privacidad`,
      lastModified: new Date().toISOString()
    },
    ...filmRoutes
  ];
}
