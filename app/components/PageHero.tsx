import Link from "next/link";
import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs = [],
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  crumbs?: { href?: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="c-page-hero">
      <div className="c-wrap">
        <nav className="c-breadcrumb" aria-label="Səhifə yolu">
          <Link href="/">Ana səhifə</Link>
          {crumbs.map((c) => (
            <span key={c.label}>
              <i>/</i>
              {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
            </span>
          ))}
        </nav>

        <span className="c-badge c-badge-terracotta">{eyebrow}</span>
        <h1>{title}</h1>
        {lead && <p className="c-page-lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
