"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../components/Logo";
import { NAV_MODULES } from "./nav";
import { UserMenu } from "../components/UserMenu";
import { useAuth } from "../lib/auth/AuthContext";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (auth.status !== "authenticated") return null;
  const { user, logout } = auth;

  const visibleModules = NAV_MODULES.filter(
    (mod) => !mod.roles || mod.roles.some((role) => user.roles.includes(role)),
  );

  const activeModule = visibleModules.find(
    (mod) => mod.href === pathname || mod.tabs?.some((tab) => tab.href === pathname),
  );

  return (
    <div className="panel-shell">
      {mobileNavOpen && (
        <div className="panel-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}

      <aside className={mobileNavOpen ? "panel-sidebar open" : "panel-sidebar"}>
        <div className="panel-sidebar-top">
          <Logo variant="header" />
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
        <button type="button" className="panel-sidebar-logout" onClick={logout}>
          <span aria-hidden="true">⎋</span> Çıxış
        </button>
      </aside>

      <div className="panel-main">
        <header className="panel-topbar">
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
          <UserMenu />
        </header>
        {activeModule?.tabs && (
          <nav className="panel-tabs" aria-label={`${activeModule.label} bölmələri`}>
            {activeModule.tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={pathname === tab.href ? "panel-tab active" : "panel-tab"}
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
