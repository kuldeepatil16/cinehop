import { HomepageClient } from "@/components/HomepageClient";
import { HomeHero } from "@/components/TranslatedBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getFilmsForDate } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialData = await getFilmsForDate({
    date: "today",
    city: "madrid",
    vose: "true"
  });

  return (
    <>
      <SiteHeader />
      <HomeHero />
      <HomepageClient initialData={initialData} />
      <SiteFooter />
    </>
  );
}
