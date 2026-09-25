"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../components/Logo";
import { NAV_GROUPS } from "./nav";
import { UserMenu } from "../components/UserMenu";
import { useAuth } from "../lib/auth/AuthContext";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (auth.status !== "authenticated") return null;
  const { user, logout } = auth;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || item.roles.some((role) => user.roles.includes(role)),
    ),
  })).filter((group) => group.items.length > 0);

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
          {visibleGroups.map((group) => (
            <div className="panel-nav-group" key={group.label}>
              <div className="panel-nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    pathname === item.href ? "panel-nav-item active" : "panel-nav-item"
                  }
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
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
        <main className="panel-content">{children}</main>
      </div>
    </div>
  );
}
