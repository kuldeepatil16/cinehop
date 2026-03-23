import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomepageClient } from "@/components/HomepageClient";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CITY_LABELS, SUPPORTED_CITIES, SITE_URL } from "@/lib/constants";
import { getFilmsForDate } from "@/lib/queries";
import type { City } from "@/lib/types";

export const dynamic = "force-dynamic";

// Tell Next.js which city slugs are valid static paths
export function generateStaticParams() {
  return SUPPORTED_CITIES.map((city) => ({ city }));
}

interface CityPageProps {
  params: { city: string };
}

function isValidCity(value: string): value is City {
  return (SUPPORTED_CITIES as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  if (!isValidCity(params.city)) return { title: "Not found | CineHop" };

  const label = CITY_LABELS[params.city];
  const title = `Cartelera de cine en ${label} hoy | CineHop`;
  const description =
    `Todas las sesiones de cine en ${label} — Cinesa, Yelmo, Kinepolis. ` +
    `Filtra por VOSE, IMAX, 4DX y precio. Cartelera ${label} actualizada cada 3 horas.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${params.city}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${params.city}`,
      siteName: "CineHop",
      locale: "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  if (!isValidCity(params.city)) notFound();

  const city = params.city;
  const label = CITY_LABELS[city];

  const initialData = await getFilmsForDate({ date: "today", city });

  // ItemList JSON-LD: helps Google understand what films are showing in this city
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Cartelera de cine en ${label} hoy`,
    description: `Películas en cartelera en ${label} — sesiones de hoy actualizadas`,
    url: `${SITE_URL}/${city}`,
    itemListElement: initialData.films.slice(0, 20).map((film, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Movie",
        name: film.title,
        url: `${SITE_URL}/film/${film.slug}`,
        ...(film.poster_url ? { image: film.poster_url } : {}),
        ...(film.genre?.length ? { genre: film.genre } : {}),
        ...(film.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: film.rating, bestRating: 10 } } : {}),
      },
    })),
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageClient initialData={initialData} initialCity={city} />
      <SiteFooter />
    </>
  );
}
