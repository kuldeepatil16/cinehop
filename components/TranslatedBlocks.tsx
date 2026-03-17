"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";

export function HomeHero() {
  const { t } = useLanguage();

  return (
    <section className="hero cine-container">
      <div className="hero-eyebrow">{t("hero_eyebrow")}</div>
      <h1 className="hero-title">
        {t("hero_title_a")}
        <em>{t("hero_title_b")}</em>
      </h1>
      <p className="hero-sub">{t("hero_sub")}</p>
    </section>
  );
}

export function PrivacyContent() {
  const { t } = useLanguage();

  return (
    <>
      <div className="mono-eyebrow">GDPR</div>
      <h1 className="hero-title mb-6">
        {t("privacy_title")},
        <em>{t("privacy_subtitle")}</em>
      </h1>
      <div className="detail-card max-w-3xl space-y-4 text-sm leading-7 text-muted">
        <p>{t("privacy_copy_1")}</p>
        <p>{t("privacy_copy_2")}</p>
        <p>{t("privacy_copy_3")}</p>
      </div>
    </>
  );
}

export function FilmBreadcrumb({ title }: { title: string }) {
  const { t } = useLanguage();

  return (
    <div className="mb-6 text-sm text-muted">
      <Link href="/">{t("home")}</Link> · <span>{title}</span>
    </div>
  );
}

export function FilmSidebar({
  totalSessions,
  runtimeMin,
  releaseDate
}: {
  totalSessions: number;
  runtimeMin: number | null;
  releaseDate: string | null;
}) {
  const { t } = useLanguage();

  return (
    <div className="detail-card">
      <div className="mono-eyebrow">{t("detail_why")}</div>
      <p className="mb-3 text-sm leading-6 text-muted">{t("detail_why_copy")}</p>
      <div className="space-y-2 text-sm text-muted">
        <div>
          {t("sessions")}: {totalSessions}
        </div>
        <div>Runtime: {runtimeMin ? `${runtimeMin} min` : t("runtime_pending")}</div>
        <div>Release: {releaseDate ?? t("runtime_pending")}</div>
      </div>
    </div>
  );
}
