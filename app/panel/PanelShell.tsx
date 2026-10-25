"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";
import { useCompanyName } from "../components/CompanyName";
import { NAV_MODULES, type SubPage } from "./nav";
import { UserMenu } from "../components/UserMenu";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../lib/auth/AuthContext";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const companyName = useCompanyName();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Telefonda menyu açılanda arxadakı məzmun sürüşdürülməsin (menyu bağlananda və ya səhifədən çıxanda bərpa olunur).
  useEffect(() => {
    if (!mobileNavOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileNavOpen]);

  if (auth.status !== "authenticated") return null;
  const { user, logout } = auth;

  const visibleModules = NAV_MODULES.filter(
    (mod) => !mod.roles || mod.roles.some((role) => user.roles.includes(role)),
  );

  // Length of the longest prefix (the tab's own href or one of its `matches`)
  // that the current path falls under; 0 when the tab doesn't match at all.
  const tabMatchLength = (tab: SubPage) =>
    Math.max(
      0,
      ...[tab.href, ...(tab.matches ?? [])]
        .filter((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
        .map((prefix) => prefix.length),
    );

  const activeModule = visibleModules.find(
    (mod) => mod.href === pathname || mod.tabs?.some((tab) => tabMatchLength(tab) > 0),
  );

  // Ən uzun uyğun gələn tab aktivdir — "/panel/binalar" (Mənzillər)
  // "/panel/binalar/bina-siyahisi" (Binalar) ilə eyni anda seçilməsin deyə.
  const activeTab = activeModule?.tabs
    ?.filter((tab) => tabMatchLength(tab) > 0)
    .sort((a, b) => tabMatchLength(b) - tabMatchLength(a))[0];

  return (
    <div className="panel-shell">
      {mobileNavOpen && (
        <div className="panel-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}

      <aside className={mobileNavOpen ? "panel-sidebar open" : "panel-sidebar"}>
        <div className="panel-sidebar-top">
          <div className="panel-sidebar-brand">
            <Logo name={companyName} href="/panel" variant="header" />
            <small>İdarəetmə paneli</small>
          </div>
          <button
            type="button"
            className="panel-sidebar-close"
            aria-label="Menyunu bağla"
            onClick={() => setMobileNavOpen(false)}
          >
            ✕
          </button>
        </div>
        <nav className="panel-nav" aria-label="Panel naviqasiyası">
          {visibleModules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={mod === activeModule ? "panel-nav-item active" : "panel-nav-item"}
              onClick={() => setMobileNavOpen(false)}
            >
              <span aria-hidden="true">{mod.icon}</span>
              {mod.label}
            </Link>
          ))}
        </nav>
        <div className="panel-sidebar-foot">
          <Link className="panel-site-link" href="/">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6" />
              <path d="M20 4 10 14" />
              <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
            Sayta bax
          </Link>
          <button type="button" className="panel-sidebar-logout" onClick={logout}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Çıxış
          </button>
        </div>
      </aside>

      <div className="panel-main">
        <header className="panel-topbar">
          <div className="panel-topbar-left">
            <button
              type="button"
              className="panel-menu-toggle"
              aria-label="Menyunu aç"
              onClick={() => setMobileNavOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <span className="panel-topbar-context">
              {activeModule?.label ?? "İdarəetmə paneli"}
            </span>
          </div>
          <div className="panel-topbar-actions">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        {activeModule?.tabs && (
          <nav className="panel-tabs" aria-label={`${activeModule.label} bölmələri`}>
            {activeModule.tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={tab === activeTab ? "panel-tab active" : "panel-tab"}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
        <main className="panel-content">{children}</main>
      </div>
    </div>
  );
}
