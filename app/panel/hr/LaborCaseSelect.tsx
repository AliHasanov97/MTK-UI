"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LaborCodeCase } from "../../lib/api/hr";

/**
 * Müddətli müqavilənin əsası (Əmək Məcəlləsinin maddəsi və bəndi) üçün açılan seçim:
 * bəndlər maddə üzrə qruplaşdırılıb, axtarış var, uzun mətn kəsilmədən göstərilir.
 */
export function LaborCaseSelect({
  cases,
  articles,
  value,
  onChange,
}: {
  /** Seçilə bilən bəndlər (parentId != null) */
  cases: LaborCodeCase[];
  /** Maddələr: id -> maddə (məs. "47") */
  articles: Map<string, LaborCodeCase>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Açılmış maddələr; susmaya görə hamısı bağlıdır
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Menyu pəncərənin (modalın) scroll sahəsini böyütməsin deyə document.body-yə çıxarılır və fixed mövqedə göstərilir
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      // Altda yer azdırsa menyu yuxarı açılır
      const openUp = below < 260 && above > below;
      const maxHeight = Math.max(200, Math.min(openUp ? above : below, 420));
      setPos(
        openUp
          ? { bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, maxHeight }
          : { top: rect.bottom + 6, left: rect.left, width: rect.width, maxHeight },
      );
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    place();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const selected = cases.find((c) => c.id === value);
  const selectedArticle = selected?.parentId ? articles.get(selected.parentId) : undefined;

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("az");
    const filtered = q
      ? cases.filter((c) => `${c.code} ${c.name}`.toLocaleLowerCase("az").includes(q))
      : cases;
    const byArticle = new Map<string, LaborCodeCase[]>();
    for (const c of filtered) {
      const key = c.parentId ?? "";
      byArticle.set(key, [...(byArticle.get(key) ?? []), c]);
    }
    return [...byArticle.entries()].map(([articleId, items]) => ({ article: articles.get(articleId), items }));
  }, [cases, articles, query]);

  return (
    <div className="lcs" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`lcs-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <>
            <span className="lc-badge">
              {selected.code})<small>{selectedArticle ? `m. ${selectedArticle.code}` : ""}</small>
            </span>
            <span className="lcs-value">{selected.name}</span>
          </>
        ) : (
          <span className="lcs-placeholder">Maddə və bəndi seçin…</span>
        )}
        <span className="lcs-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="lcs-menu"
          role="listbox"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
        >
          <input
            className="lcs-search"
            placeholder="Bənd üzrə axtar…"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="lcs-options" style={{ maxHeight: pos.maxHeight - 64 }}>
            {groups.length === 0 && <div className="lcs-empty">Nəticə tapılmadı</div>}
            {groups.map(({ article, items }) => {
              const key = article?.id ?? "none";
              // Axtarış zamanı nəticələr görünsün deyə uyğun maddələr açıq göstərilir
              const isOpen = !article || query.trim() !== "" || expanded.has(key);
              return (
                <div key={key} className="lcs-group">
                  {article && (
                    <button
                      type="button"
                      className="lcs-article"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })
                      }
                    >
                      <span className={`lcs-chevron ${isOpen ? "open" : ""}`} aria-hidden>
                        ›
                      </span>
                      <span className="lcs-article-no">Maddə {article.code}</span>
                      <span className="lcs-article-name">{article.name}</span>
                      <span className="lcs-article-count">{items.length}</span>
                    </button>
                  )}
                  {isOpen && (
                    <div className={article ? "lcs-children" : undefined}>
                      {items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={c.id === value}
                          className={`lcs-option ${c.id === value ? "active" : ""}`}
                          onClick={() => {
                            onChange(c.id);
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <span className="lcs-code">{c.code})</span>
                          <span className="lcs-text">{c.name}</span>
                          {c.id === value && <span className="lcs-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
