"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import { searchUsers, type UserSummary } from "../../lib/api/identity";

// Same portal-to-body approach as OwnerPicker: modals scroll, so a plain
// absolutely positioned dropdown can get clipped near the bottom.
export function UserPicker({
  selected,
  onSelect,
  label = "İstifadəçi",
}: {
  selected: UserSummary | null;
  onSelect: (user: UserSummary | null) => void;
  label?: string;
}) {
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }
      searchUsers(auth.accessToken, { searchTerm: trimmed, pageNumber: 1, pageSize: 8 })
        .then((res) => setResults(res.users))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [auth, query]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleFocus() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
  }

  if (selected) {
    return (
      <div className="owner-picker-selected">
        <div>
          <strong>
            {selected.firstName} {selected.lastName}
          </strong>
          <span>{selected.email}</span>
        </div>
        <button type="button" className="panel-btn panel-btn-sm" onClick={() => onSelect(null)}>
          Dəyiş
        </button>
      </div>
    );
  }

  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder="Ad, email və ya telefonla axtar…"
        autoComplete="off"
      />
      {open &&
        position &&
        query.trim() &&
        createPortal(
          <div
            className="owner-picker-results"
            ref={panelRef}
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            {results.length === 0 ? (
              <p className="col-filter-empty">Nəticə yoxdur</p>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="owner-picker-result"
                  onClick={() => {
                    onSelect(u);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <strong>
                    {u.firstName} {u.lastName}
                  </strong>
                  <span>{u.email}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
