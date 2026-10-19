"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import "./confirm-dialog.css";

export type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger — qırmızı (silmə, ləğv); primary — yaşıl (təsdiq) */
  tone?: "danger" | "primary";
};

type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Mətn yazılışından ton və düymə adlarını çıxarır: "…silinsin?" → Sil, "…ləğv edilsin?" → Ləğv et, qalanı → Təsdiq. */
function resolveOptions(input: string | ConfirmOptions): Required<Omit<ConfirmOptions, "message">> & { message: ReactNode } {
  const opts: ConfirmOptions = typeof input === "string" ? { message: input } : input;
  const text = typeof opts.message === "string" ? opts.message : "";
  const isDelete = /silin|silmək/i.test(text);
  const isCancel = /ləğv/i.test(text);

  const tone = opts.tone ?? (isDelete || isCancel ? "danger" : "primary");
  return {
    message: opts.message,
    tone,
    title: opts.title ?? (isDelete ? "Silməni təsdiqləyin" : isCancel ? "Ləğvi təsdiqləyin" : "Təsdiq tələb olunur"),
    confirmLabel: opts.confirmLabel ?? (isDelete ? "Bəli, sil" : isCancel ? "Bəli, ləğv et" : "Bəli, təsdiqlə"),
    cancelLabel: opts.cancelLabel ?? "Xeyr",
  };
}

type Pending = { options: ReturnType<typeof resolveOptions>; resolve: (value: boolean) => void };

/** Brauzerin daxili confirm()-i əvəzinə saytın öz təsdiq pəncərəsi. İstifadə: `if (!(await confirm("… silinsin?"))) return;` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const settle = useCallback((value: boolean) => {
    pendingRef.current?.resolve(value);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback<ConfirmFn>((input) => {
    // Açıq pəncərə varsa, əvvəlki sorğu "xeyr" kimi bağlanır.
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { options: resolveOptions(input), resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    // Təhlükəsizlik üçün fokus "Xeyr" düyməsindədir: təsadüfi Enter silməyə səbəb olmasın.
    cancelButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && settle(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, settle]);

  const o = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {o && (
        <div className="modal-backdrop cd-backdrop" onClick={(e) => e.target === e.currentTarget && settle(false)}>
          <div className="modal-card cd-card" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-message">
            <div className={`cd-icon cd-icon-${o.tone}`} aria-hidden="true">
              {o.tone === "danger" ? "!" : "?"}
            </div>
            <h2 id="cd-title">{o.title}</h2>
            <p id="cd-message" className="cd-message">
              {o.message}
            </p>
            <div className="cd-actions">
              <button ref={cancelButton} type="button" className="panel-btn" onClick={() => settle(false)}>
                {o.cancelLabel}
              </button>
              <button type="button" className={o.tone === "danger" ? "panel-btn cd-danger" : "panel-btn panel-btn-primary"} onClick={() => settle(true)}>
                {o.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm yalnız <ConfirmProvider> daxilində işləyir.");
  return confirm;
}
