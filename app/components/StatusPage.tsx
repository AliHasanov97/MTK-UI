import type { ReactNode } from "react";
import { Logo } from "./Logo";
import "./status-page.css";

/** 404 / 500 kimi tam səhifəlik status ekranı (server və client komponentlərində işləyir). */
export function StatusPage({
  code,
  title,
  text,
  brand,
  digest,
  children,
  extra,
}: {
  code: string;
  title: string;
  text: string;
  brand: string;
  /** Xəta kodu (Next.js digest) — dəstəyə göndərmək üçün */
  digest?: string;
  /** Düymələr */
  children: ReactNode;
  /** Düymələrin altında əlavə məzmun (məs: faydalı keçidlər) */
  extra?: ReactNode;
}) {
  return (
    <main className="sp">
      <div className="sp-glow" aria-hidden="true" />
      <div className="sp-card">
        <div className="sp-brand">
          <Logo name={brand} href="/" />
        </div>
        <div className="sp-code" aria-hidden="true">
          {code}
        </div>
        <h1>{title}</h1>
        <p className="sp-text">{text}</p>
        <div className="sp-actions">{children}</div>
        {digest && (
          <p className="sp-digest">
            Xəta kodu: <code>{digest}</code>
          </p>
        )}
        {extra}
      </div>
    </main>
  );
}
