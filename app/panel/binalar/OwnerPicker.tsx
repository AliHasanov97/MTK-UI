"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import { searchOwners, type OwnerListItem } from "../../lib/api/owners";

// Modals scroll (max-height + overflow-y:auto), so a plain absolutely
// positioned dropdown can get clipped near the bottom — same issue the
// apartments table's column filters had, fixed the same way here (portal to
// body, fixed position from the input's own bounding rect).
export function OwnerPicker({
  selected,
  onSelect,
  label = "Sahib",
}: {
  selected: OwnerListItem | null;
  onSelect: (owner: OwnerListItem | null) => void;
  label?: string;
}) {
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnerListItem[]>([]);
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
      searchOwners(auth.accessToken, { searchTerm: trimmed, pageSize: 8 })
        .then((res) => setResults(res.items))
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
          <strong>{selected.fullName}</strong>
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
              results.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="owner-picker-result"
                  onClick={() => {
                    onSelect(o);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <strong>{o.fullName}</strong>
                  <span>{o.email}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
