"use client";

import "./theme-toggle.css";

const STORAGE_KEY = "theme";

/** Rejimi cookie-yə yazır ki, Keycloak teması (auth.vahid.az) da eyni rejimi götürsün. */
function writeThemeCookie(theme: string) {
  const domain = /(^|\.)vahid\.az$/.test(location.hostname) ? ";domain=.vahid.az" : "";
  document.cookie = `${STORAGE_KEY}=${theme};path=/;max-age=31536000;samesite=lax${domain}`;
}

/**
 * İşıqlı/tund rejim düyməsi. Cari rejim <html data-theme> atributundadır
 * (layout-dakı skript səhifə çəkilməmişdən əvvəl qurur); hər iki ikon render
 * olunur, CSS rejimə görə birini göstərir — buna görə hidrasiya uyğunsuzluğu olmur.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    writeThemeCookie(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // brauzer yadda saxlamağa icazə vermirsə, rejim yalnız bu səhifə üçün qalır
    }
  };

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="İşıqlı / tund rejimi dəyiş" title="İşıqlı / tund rejim">
      <svg className="theme-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg className="theme-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
