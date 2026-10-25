import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "../../components/SiteShell";
import { PageHero } from "../../components/PageHero";
import { LoginButton } from "../../components/LoginButton";
import { getGuide, guides } from "../../guides";
import { ROLE_LABELS } from "../../lib/auth/roleConstants";

type Props = { params: Promise<{ modul: string }> };

export function generateStaticParams() {
  return guides.map((g) => ({ modul: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).modul);
  return { title: guide ? `${guide.title} — təlimat` : "Təlimat" };
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).modul);
  if (!guide) notFound();

  const related = guide.related.map((s) => getGuide(s)).filter((g) => g !== undefined);

  return (
    <SiteShell>
      <PageHero
        eyebrow="TƏLİMAT"
        title={guide.title}
        lead={guide.summary}
        crumbs={[{ href: "/telimat", label: "Təlimat" }, { label: guide.title }]}
      >
        <div className="c-page-roles">
          <small>Kim istifadə edir:</small>
          {guide.roles.map((r) => (
            <span key={r}>{ROLE_LABELS[r]}</span>
          ))}
        </div>
      </PageHero>

      <div className="c-wrap c-guide-layout">
        <aside className="c-guide-aside" aria-label="Bölmələr">
          <strong>Təlimatlar</strong>
          {guides.map((g) => (
            <Link key={g.slug} href={`/telimat/${g.slug}`} aria-current={g.slug === guide.slug ? "page" : undefined}>
              {g.title}
            </Link>
          ))}
        </aside>

        <article className="c-prose">
          {guide.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <ol>
                {s.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ))}

          {guide.tips.length > 0 && (
            <section className="c-tips">
              <h2>Məsləhətlər</h2>
              <ul>
                {guide.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2>Əlaqəli təlimatlar</h2>
              <div className="c-related">
                {related.map((g) => (
                  <Link key={g.slug} href={`/telimat/${g.slug}`}>
                    {g.icon} {g.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="c-guide-cta">
            <LoginButton className="c-btn c-btn-orange">Panelə daxil ol</LoginButton>
          </div>
        </article>
      </div>
    </SiteShell>
  );
}
