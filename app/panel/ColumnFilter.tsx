"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type FilterOption<T> = { value: T; label: string };

/**
 * Cədvəl başlığındakı çoxseçimli sütun filtri (mənzillər siyahısındakı ilə eyni görünüş):
 * seçim siyahısı daxilində axtarış, "Təmizlə" düyməsi və seçilmiş sayı göstəricisi.
 */
export function ColumnFilter<T extends string | number>({
  options,
  selected,
  onChange,
}: {
  options: FilterOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle(value: T) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        const panelWidth = 220;
        setPosition({
          top: rect.bottom + 6,
          left: Math.min(Math.max(8, rect.right - panelWidth), window.innerWidth - panelWidth - 8),
        });
      }
    }
    setOpen((o) => !o);
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("az");
  const visibleOptions = normalizedQuery
    ? options.filter((opt) => opt.label.toLocaleLowerCase("az").includes(normalizedQuery))
    : options;

  return (
    <div className="col-filter">
      <button
        ref={btnRef}
        type="button"
        className={`col-filter-btn${selected.length > 0 ? " active" : ""}`}
        aria-label="Filtr"
        onClick={toggleOpen}
      >
        ▾
        {selected.length > 0 && <span className="col-filter-badge">{selected.length}</span>}
      </button>
      {open &&
        position &&
        createPortal(
          <div
            className="col-filter-panel"
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="col-filter-search"
              placeholder="Axtar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="col-filter-options">
              {visibleOptions.length === 0 && <p className="col-filter-empty">Nəticə yoxdur</p>}
              {visibleOptions.map((opt) => (
                <label key={String(opt.value)} className="col-filter-option">
                  <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
            {selected.length > 0 && (
              <button type="button" className="col-filter-clear" onClick={() => onChange([])}>
                Təmizlə
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{direction === "asc" ? "▲" : "▼"}</span>;
}
