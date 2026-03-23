import type { Metadata } from "next";
import { Bebas_Neue, DM_Mono, DM_Sans } from "next/font/google";

import "@/app/globals.css";
import { HOMEPAGE_META, SITE_NAME } from "@/lib/constants";
import { CookieBanner } from "@/components/CookieBanner";
import { LanguageProvider } from "@/components/LanguageProvider";
import { VercelAnalytics } from "@/components/VercelAnalytics";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
  weight: "400"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap"
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: HOMEPAGE_META.title,
  description: HOMEPAGE_META.description,
  applicationName: SITE_NAME,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shouldLoadAnalytics = process.env.VERCEL === "1";

  return (
    <html lang="es">
      <body className={`${bebasNeue.variable} ${dmSans.variable} ${dmMono.variable}`}>
        <LanguageProvider>
          {children}
          <CookieBanner />
          {shouldLoadAnalytics ? <VercelAnalytics /> : null}
        </LanguageProvider>
      </body>
    </html>
  );
}
