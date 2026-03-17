"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const STORAGE_KEY = "cinehop-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setVisible(!window.localStorage.getItem(STORAGE_KEY));
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="cookie-banner">
      <div className="mb-2 font-display text-2xl">{t("cookie_title")}</div>
      <p className="mb-4 text-sm leading-6 text-muted">{t("cookie_copy")}</p>
      <div className="flex gap-2">
        <button
          className="search-button px-4 py-2 text-base"
          type="button"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, "accepted");
            setVisible(false);
          }}
        >
          {t("accept")}
        </button>
        <button
          className="pill active"
          type="button"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, "essential-only");
            setVisible(false);
          }}
        >
          {t("essential_only")}
        </button>
      </div>
    </div>
  );
}
