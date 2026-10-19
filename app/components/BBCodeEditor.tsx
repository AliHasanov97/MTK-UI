"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { BBCode } from "./BBCode";
import "./bbcode.css";

type Action = { label: string; title: string; open: string; close: string; placeholder: string; style?: React.CSSProperties; block?: boolean };

const ACTIONS: Action[] = [
  { label: "B", title: "Qalın (Ctrl+B)", open: "[b]", close: "[/b]", placeholder: "qalın mətn", style: { fontWeight: 800 } },
  { label: "I", title: "Kursiv (Ctrl+I)", open: "[i]", close: "[/i]", placeholder: "kursiv mətn", style: { fontStyle: "italic" } },
  { label: "U", title: "Altından xətt (Ctrl+U)", open: "[u]", close: "[/u]", placeholder: "mətn", style: { textDecoration: "underline" } },
  { label: "S", title: "Üstündən xətt", open: "[s]", close: "[/s]", placeholder: "mətn", style: { textDecoration: "line-through" } },
  { label: "H2", title: "Böyük başlıq", open: "[h2]", close: "[/h2]", placeholder: "Başlıq", block: true },
  { label: "H3", title: "Kiçik başlıq", open: "[h3]", close: "[/h3]", placeholder: "Alt başlıq", block: true },
  { label: "• Siyahı", title: "Markerli siyahı", open: "[list]\n[*] ", close: "\n[*] \n[/list]", placeholder: "bənd", block: true },
  { label: "1. Siyahı", title: "Nömrəli siyahı", open: "[list=1]\n[*] ", close: "\n[*] \n[/list]", placeholder: "bənd", block: true },
  { label: "❝ Sitat", title: "Sitat", open: "[quote]", close: "[/quote]", placeholder: "sitat", block: true },
  { label: "Link", title: "Link", open: "[url=https://]", close: "[/url]", placeholder: "link mətni" },
  { label: "Şəkil", title: "Şəkil (ünvan ilə)", open: "[img]", close: "[/img]", placeholder: "https://…" },
  { label: "—", title: "Ayırıcı xətt", open: "[hr]", close: "", placeholder: "", block: true },
];

/**
 * BBCode redaktoru: alətlər zolağı + "Yaz / Önizləmə". Mətn BBCode kimi saxlanılır
 * (backend-də sadə mətn sahəsidir), render isə <BBCode> ilə təhlükəsiz edilir.
 */
export function BBCodeEditor({
  id,
  value,
  onChange,
  rows = 12,
  required,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  required?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  function apply(a: Action) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const inner = selected || a.placeholder;
    const before = a.block && start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const insert = `${before}${a.open}${inner}${a.close}`;
    onChange(value.slice(0, start) + insert + value.slice(end));

    // Seçim: yazılmış/yer tutucu mətn seçili qalsın ki, dərhal üzərinə yazmaq olsun.
    const innerStart = start + before.length + a.open.length;
    requestAnimationFrame(() => {
      el.focus();
      if (a.close || inner) el.setSelectionRange(innerStart, innerStart + inner.length);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    const action = key === "b" ? ACTIONS[0] : key === "i" ? ACTIONS[1] : key === "u" ? ACTIONS[2] : null;
    if (action) {
      e.preventDefault();
      apply(action);
    }
  }

  return (
    <div className="bbe">
      <div className="bbe-bar">
        <div className="bbe-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "write"} className={tab === "write" ? "active" : ""} onClick={() => setTab("write")}>
            Yaz
          </button>
          <button type="button" role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
            Önizləmə
          </button>
        </div>
        {tab === "write" && (
          <div className="bbe-tools">
            {ACTIONS.map((a) => (
              <button key={a.label} type="button" title={a.title} style={a.style} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(a)}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "write" ? (
        <textarea
          id={id}
          ref={ref}
          className="bbe-text"
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={"Mətni yazın. Alətlər zolağından formatlaşdırma əlavə edin.\nAbzasları boş sətirlə ayırın."}
        />
      ) : (
        <div className="bbe-preview">
          {value.trim() ? <BBCode source={value} /> : <p className="bbe-empty">Önizləmə üçün mətn yazın.</p>}
        </div>
      )}
    </div>
  );
}
