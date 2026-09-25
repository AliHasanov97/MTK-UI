"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth/AuthContext";
import { buildAccountUrl } from "../lib/auth/client";
import { ROLE_LABELS, type Role } from "../lib/auth/roles";

export function UserMenu() {
  const auth = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (auth.status !== "authenticated") return null;
  const { user } = auth;
  const displayName = user.name ?? user.username;
  const roleLabels = user.roles
    .filter((role): role is Role => role in ROLE_LABELS)
    .map((role) => ROLE_LABELS[role]);
  const isInPanel = pathname?.startsWith("/panel");

  return (
    <div className="panel-user-menu" ref={rootRef}>
      <button
        type="button"
        className="panel-user-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="panel-user-avatar" aria-hidden="true">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="panel-user-info">
          <strong>{displayName}</strong>
          <span className="panel-role-tags">
            {roleLabels.length > 0 ? (
              roleLabels.map((label) => (
                <span className="panel-role-tag" key={label}>
                  {label}
                </span>
              ))
            ) : (
              <span className="panel-role-tag">Rol təyin edilməyib</span>
            )}
          </span>
        </span>
        <span className="panel-user-caret" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && (
        <div className="panel-user-dropdown" role="menu">
          {!isInPanel && (
            <Link
              className="panel-user-dropdown-item"
              role="menuitem"
              href="/panel"
              onClick={() => setOpen(false)}
            >
              Panelə keç
            </Link>
          )}
          <a
            className="panel-user-dropdown-item"
            role="menuitem"
            href={buildAccountUrl(auth.config)}
          >
            Hesabı idarə et
          </a>
          <button
            type="button"
            className="panel-user-dropdown-item panel-user-dropdown-danger"
            role="menuitem"
            onClick={auth.logout}
          >
            Çıxış
          </button>
        </div>
      )}
    </div>
  );
}
