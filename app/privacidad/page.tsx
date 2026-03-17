import { PrivacyContent } from "@/components/TranslatedBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Privacidad | CineHop"
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="detail-shell cine-container">
        <PrivacyContent />
      </main>
      <SiteFooter />
    </>
  );
}
