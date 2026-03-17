import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ChainBadge } from "@/components/ChainBadge";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TimeButton } from "@/components/TimeButton";
import { FilmBreadcrumb, FilmSidebar } from "@/components/TranslatedBlocks";
import { getFilmBySlug } from "@/lib/queries";
import { toCanonicalUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface FilmPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: FilmPageProps): Promise<Metadata> {
  const data = await getFilmBySlug(params.slug);

  if (!data) {
    return {
      title: "Film not found | CineHop"
    };
  }

  return {
    title: `${data.film.title} showtimes Madrid | CineHop`,
    description: data.film.synopsis ?? `All upcoming ${data.film.title} sessions in Madrid.`,
    alternates: {
      canonical: toCanonicalUrl(`/film/${params.slug}`)
    },
    openGraph: {
      title: `${data.film.title} showtimes Madrid | CineHop`,
      description: data.film.synopsis ?? undefined,
      images: data.film.poster_url ? [{ url: data.film.poster_url }] : undefined
    }
  };
}

export default async function FilmPage({ params }: FilmPageProps) {
  const data = await getFilmBySlug(params.slug);

  if (!data) {
    notFound();
  }

  const { film } = data;
  const structuredData = film.upcoming_sessions.flatMap((dateGroup) =>
    dateGroup.chains.flatMap((chainGroup) =>
      chainGroup.cinemas.flatMap((cinemaGroup) =>
        cinemaGroup.showtimes.map((showtime) => ({
          "@context": "https://schema.org",
          "@type": "Event",
          name: `${film.title} - ${showtime.format}`,
          startDate: `${showtime.show_date}T${showtime.show_time}:00`,
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "MovieTheater",
            name: cinemaGroup.cinema.name,
            address: cinemaGroup.cinema.address
          },
          image: film.poster_url ? [film.poster_url] : undefined,
          offers: showtime.price_eur
            ? {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: showtime.price_eur.toFixed(2),
                url: showtime.booking_url
              }
            : undefined
        }))
      )
    )
  );

  return (
    <>
      <SiteHeader />
      <main className="detail-shell cine-container">
        <FilmBreadcrumb title={film.title} />
        <section className="detail-hero">
          <div className="detail-hero-inner">
            <div className="film-poster h-[320px] w-[220px]">
              {film.poster_url ? (
                <Image src={film.poster_url} alt={film.title} width={220} height={320} className="h-full w-full object-cover" />
              ) : (
                <div className="film-placeholder h-[320px] w-[220px]">{film.title.slice(0, 1)}</div>
              )}
            </div>
            <div>
              <div className="mono-eyebrow">Madrid sessions</div>
              <h1 className="detail-title">{film.title}</h1>
              <div className="mb-4 flex flex-wrap gap-2">
                {(film.genre ?? []).map((genre) => (
                  <span key={genre} className="badge badge-soft">
                    {genre}
                  </span>
                ))}
                {film.rating ? <span className="badge badge-vose">IMDb {film.rating.toFixed(1)}</span> : null}
              </div>
              <p className="detail-copy">{film.synopsis ?? "Synopsis not yet available."}</p>
            </div>
          </div>
        </section>

        <div className="detail-grid">
          <section className="detail-card">
            {film.upcoming_sessions.map((dateGroup) => (
              <div key={dateGroup.date} className="date-block">
                <h2 className="detail-date">{new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(dateGroup.date))}</h2>
                {dateGroup.chains.map((chainGroup) => (
                  <div key={chainGroup.chain} className="chain-row">
                    <div className="mb-3">
                      <ChainBadge chain={chainGroup.chain} />
                    </div>
                    {chainGroup.cinemas.map((cinemaGroup) => (
                      <div key={cinemaGroup.cinema.id} className="cinema-block">
                        <div className="mb-2">
                          <div className="font-display text-xl">{cinemaGroup.cinema.name}</div>
                          <div className="text-sm text-muted">{cinemaGroup.cinema.address}</div>
                        </div>
                        <div className="session-times">
                          {cinemaGroup.showtimes.map((showtime) => (
                            <TimeButton
                              key={showtime.id}
                              href={showtime.booking_url}
                              label={showtime.show_time}
                              price={showtime.price_eur}
                              showtimeId={showtime.id}
                              chain={chainGroup.chain}
                              filmSlug={film.slug}
                              format={showtime.format}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </section>

          <aside className="space-y-4">
            <div id="ad-slot-sidebar" className="ad-slot">
              Espacio anuncio lateral
            </div>
            <FilmSidebar totalSessions={film.total_sessions} runtimeMin={film.runtime_min} releaseDate={film.release_date} />
          </aside>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
