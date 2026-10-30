"use client";

import { useEffect, useId, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { hasAnyRole, ROLES } from "../../lib/auth/roleConstants";
import { AssistantChat } from "./AssistantChat";

const ALLOWED = [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER];

/**
 * Panelin aşağı sağ küncündə üzən söhbət düyməsi. Bütün panel səhifələrində
 * görünür, ona görə komendant istənilən ekrandan köməkçini açıb sual verə bilər.
 */
export function AssistantWidget() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // Giriş yoxdursa və ya rol uyğun deyilsə düymə ümumiyyətlə göstərilmir.
  if (auth.status !== "authenticated" || !hasAnyRole(auth.user.roles, ALLOWED)) {
    return null;
  }

  return (
    <div className={`ai-widget ${open ? "ai-widget-open" : ""}`}>
      {open && (
        <div className="ai-widget-panel" id={panelId} role="dialog" aria-label="AI köməkçi">
          <AssistantChat onClose={() => setOpen(false)} />
        </div>
      )}

      <div className="ai-widget-fab">
        <button
          type="button"
          className="ai-widget-toggle"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "AI köməkçini bağla" : "AI köməkçini aç"}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          title={open ? "Bağla" : "AI köməkçi"}
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <path
                d="M1.5 1.5l11 11m0-11l-11 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 2.6l1.95 5.45L19.4 10l-5.45 1.95L12 17.4l-1.95-5.45L4.6 10l5.45-1.95L12 2.6z" />
              <path
                d="M19 15.2l.85 2.35L22.2 18.4l-2.35.85L19 21.6l-.85-2.35-2.35-.85 2.35-.85L19 15.2z"
                opacity=".72"
              />
            </svg>
          )}
        </button>
        <span className="ai-widget-label" aria-hidden="true">
          {open ? "Bağla" : "AI köməkçi"}
        </span>
      </div>
    </div>
  );
}
