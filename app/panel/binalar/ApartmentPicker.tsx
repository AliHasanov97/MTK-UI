"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import { searchApartments, type Apartment } from "../../lib/api/buildings";

// Mirrors OwnerPicker.tsx — same portal-to-body positioning (so a modal's own
// max-height/overflow-y:auto can't clip the results panel).
export function ApartmentPicker({
  selected,
  onSelect,
  label = "Mənzil",
}: {
  selected: Apartment | null;
  onSelect: (apartment: Apartment | null) => void;
  label?: string;
}) {
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Apartment[]>([]);
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
      searchApartments(auth.accessToken, { searchTerm: trimmed, pageSize: 8 })
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
          <strong>
            Mənzil {selected.apartmentNumber} — {selected.building.name}
          </strong>
          <span>{selected.currentOwner?.name ?? "Sahibsiz"}</span>
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
        placeholder="Mənzil nömrəsi və ya bina adı ilə axtar…"
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
              results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="owner-picker-result"
                  onClick={() => {
                    onSelect(a);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <strong>
                    Mənzil {a.apartmentNumber} — {a.building.name}
                  </strong>
                  <span>{a.currentOwner?.name ?? "Sahibsiz"}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
