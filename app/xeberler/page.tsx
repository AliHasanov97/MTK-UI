import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { formatArticleDate, getLatestArticles } from "../lib/api/articles";

export const metadata: Metadata = { title: "Xəbərlər" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  // Backend-də "bütün yayımlanmışlar" səhifələməsi yoxdur, yalnız "son N" endpoint-i var.
  const articles = await getLatestArticles(50);

  return (
    <SiteShell>
      <PageHero
        eyebrow="XƏBƏRLƏR"
        title={
          <>
            Xəbərlər və <span>elanlar.</span>
          </>
        }
        lead="Kooperativin son xəbərləri və elanları."
        crumbs={[{ label: "Xəbərlər" }]}
      />
      <section className="lp-news section-wrap">
        {articles.length === 0 ? (
          <p className="lp-news-empty">Hələ yayımlanmış xəbər yoxdur.</p>
        ) : (
          <div className="lp-news-grid">
            {articles.map((a) => (
              <Link key={a.id} href={`/xeberler/${a.id}`} className="lp-news-card">
                <div className="lp-news-meta">
                  <time dateTime={a.publishedAt ?? a.createdAt}>{formatArticleDate(a.publishedAt ?? a.createdAt)}</time>
                </div>
                <h3>{a.title}</h3>
                <p>{a.summary}</p>
                <span className="text-link">Ətraflı oxu →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
