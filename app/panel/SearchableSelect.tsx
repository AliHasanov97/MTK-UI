"use client";

import { useEffect, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filtered = options.filter((o) =>
    `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="searchable-select" ref={rootRef}>
      <input
        className="searchable-select-input"
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
      />
      {selected && !open && (
        <button
          type="button"
          className="searchable-select-clear"
          aria-label="Təmizlə"
          onClick={() => onChange("")}
        >
          ×
        </button>
      )}
      {open && (
        <div className="searchable-select-menu">
          {filtered.length === 0 && (
            <div className="searchable-select-empty">Nəticə tapılmadı</div>
          )}
          {filtered.map((option) => (
            <button
              type="button"
              key={option.value}
              className="searchable-select-option"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                setQuery("");
              }}
            >
              <span>{option.label}</span>
              {option.sublabel && <small>{option.sublabel}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
