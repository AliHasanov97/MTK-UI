"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import "./DateInput.css";

/**
 * Saytın ortaq tarix seçicisi — native <input type="date|month"> əvəzinə.
 * Dəyər native inputla eyni formatdadır: "yyyy-MM-dd" (mode="month" üçün "yyyy-MM"),
 * onChange isə `e.target.value` oxuyan köhnə handler-lərlə uyğun gəlir.
 */

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
const WEEKDAYS = ["B.e", "Ç.a", "Çər", "C.a", "Cüm", "Şən", "Baz"]; // həftə bazar ertəsindən başlayır

const POP_WIDTH = 288;
const POP_HEIGHT = 348;

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(value);
  if (!match) return null;
  const y = +match[1];
  const m = +match[2] - 1;
  const d = match[3] ? +match[3] : 1;
  const date = new Date(y, m, d);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? { y, m, d } : null;
}

const display = (value: string, mode: Mode) => {
  const p = parseIso(value);
  if (!p) return "";
  return mode === "month" ? `${MONTHS[p.m]} ${p.y}` : `${pad(p.d)}.${pad(p.m + 1)}.${p.y}`;
};

/** "dd.MM.yyyy" → "yyyy-MM-dd" (etibarsızdırsa null). */
function parseTyped(text: string): string | null {
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [d, m, y] = [+match[1], +match[2] - 1, +match[3]];
  const date = new Date(y, m, d);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? toIso(y, m, d) : null;
}

type Mode = "date" | "month";
type View = "days" | "months";

export type DateInputProps = {
  value: string;
  onChange?: (e: { target: { value: string } }) => void;
  mode?: Mode;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  "aria-label"?: string;
};

export function DateInput({
  value,
  onChange,
  mode = "date",
  min,
  max,
  required,
  disabled,
  id,
  name,
  className,
  style,
  placeholder,
  "aria-label": ariaLabel,
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>(mode === "month" ? "months" : "days");
  const selected = parseIso(value);
  const today = new Date();
  const [cursor, setCursor] = useState({ y: selected?.y ?? today.getFullYear(), m: selected?.m ?? today.getMonth() });
  const [draft, setDraft] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();

  const emit = useCallback((next: string) => onChange?.({ target: { value: next } }), [onChange]);

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(12, Math.min(r.left, window.innerWidth - POP_WIDTH - 12));
    const below = r.bottom + 6;
    const top = below + POP_HEIGHT > window.innerHeight && r.top - 6 - POP_HEIGHT > 0 ? r.top - 6 - POP_HEIGHT : below;
    setPos({ top, left });
  }, []);

  const openPicker = () => {
    if (disabled) return;
    const p = parseIso(value);
    setCursor({ y: p?.y ?? today.getFullYear(), m: p?.m ?? today.getMonth() });
    setView(mode === "month" ? "months" : "days");
    place();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !wrapRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const pick = (iso: string) => {
    emit(iso);
    setDraft(null);
    setOpen(false);
  };

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseTyped(draft);
    if (parsed && !outOfRange(parsed)) emit(parsed);
    else if (draft.trim() === "" && !required) emit("");
    setDraft(null);
  };

  // 6 həftəlik şəbəkə: əvvəlki/sonrakı ayın günləri solğun göstərilir.
  const gridDays = (() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(cursor.y, cursor.m, 1 - offset + i));
  })();

  const shiftMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
  const monthIso = (y: number, m: number) => `${y}-${pad(m + 1)}`;

  return (
    <span className="dp" ref={wrapRef} style={style}>
      <input
        id={id}
        name={name}
        className={className}
        type="text"
        inputMode={mode === "month" ? undefined : "numeric"}
        readOnly={mode === "month"}
        autoComplete="off"
        placeholder={placeholder ?? (mode === "month" ? "Ay seçin" : "gg.aa.iiii")}
        aria-label={ariaLabel}
        required={required}
        disabled={disabled}
        value={draft ?? display(value, mode)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter" && mode === "date" && draft !== null) {
            e.preventDefault();
            commitDraft();
          }
          if (e.key === "ArrowDown" && !open) openPicker();
        }}
        onClick={mode === "month" ? openPicker : undefined}
      />
      <button type="button" className="dp-toggle" tabIndex={-1} aria-label="Kalendarı aç" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popId : undefined} disabled={disabled} onClick={() => (open ? setOpen(false) : openPicker())}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div id={popId} ref={popRef} className="dp-pop" role="dialog" aria-label="Tarix seçimi" style={{ top: pos.top, left: pos.left }}>
            <div className="dp-head">
              <button type="button" className="dp-nav" aria-label={view === "days" ? "Əvvəlki ay" : "Əvvəlki il"} onClick={() => (view === "days" ? shiftMonth(-1) : setCursor((c) => ({ ...c, y: c.y - 1 })))}>
                ‹
              </button>
              <button type="button" className="dp-title" onClick={() => setView(view === "days" ? "months" : "days")} disabled={mode === "month"}>
                {view === "days" ? `${MONTHS[cursor.m]} ${cursor.y}` : cursor.y}
              </button>
              <button type="button" className="dp-nav" aria-label={view === "days" ? "Sonrakı ay" : "Sonrakı il"} onClick={() => (view === "days" ? shiftMonth(1) : setCursor((c) => ({ ...c, y: c.y + 1 })))}>
                ›
              </button>
            </div>

            {view === "days" ? (
              <div className="dp-grid" role="grid">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="dp-dow">
                    {w}
                  </span>
                ))}
                {gridDays.map((d) => {
                  const iso = toIso(d.getFullYear(), d.getMonth(), d.getDate());
                  const cls = ["dp-day", d.getMonth() !== cursor.m && "dp-out", iso === todayIso && "dp-today", iso === value && "dp-sel"].filter(Boolean).join(" ");
                  return (
                    <button key={iso} type="button" className={cls} disabled={outOfRange(iso)} aria-pressed={iso === value} onClick={() => pick(iso)}>
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="dp-months">
                {MONTHS_SHORT.map((label, m) => {
                  const iso = monthIso(cursor.y, m);
                  const isSel = selected?.y === cursor.y && selected?.m === m;
                  const isNow = today.getFullYear() === cursor.y && today.getMonth() === m;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={["dp-month", isSel && "dp-sel", isNow && "dp-today"].filter(Boolean).join(" ")}
                      onClick={() => {
                        if (mode === "month") pick(iso);
                        else {
                          setCursor({ y: cursor.y, m });
                          setView("days");
                        }
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="dp-foot">
              <button type="button" className="dp-link" onClick={() => (mode === "month" ? pick(monthIso(today.getFullYear(), today.getMonth())) : pick(todayIso))} disabled={mode === "date" && outOfRange(todayIso)}>
                {mode === "month" ? "Bu ay" : "Bu gün"}
              </button>
              {!required && value && (
                <button type="button" className="dp-link dp-link-muted" onClick={() => pick("")}>
                  Təmizlə
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
