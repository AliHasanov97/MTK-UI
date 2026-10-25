import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { ArrowRightIcon, CalendarIcon } from "../components/icons";
import { Closing } from "../components/Closing";
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

      <section className="c-section">
        <div className="c-wrap">
          {articles.length === 0 ? (
            <p className="c-news-empty">Hələ yayımlanmış xəbər yoxdur.</p>
          ) : (
            <div className="c-news-grid">
              {articles.map((a) => {
                const publishedAt = a.publishedAt ?? a.createdAt;
                return (
                  <Link key={a.id} href={`/xeberler/${a.id}`} className="c-news-card">
                    <div className="c-news-top">
                      <span className="c-badge c-badge-terracotta">XƏBƏRLƏR</span>
                      <span className="c-news-date">
                        <CalendarIcon size={12} />
                        {formatArticleDate(publishedAt)}
                      </span>
                    </div>
                    <h3>{a.title}</h3>
                    <p>{a.summary}</p>
                    <div className="c-news-foot">
                      <span className="c-read-pill">
                        Ətraflı oxu
                        <ArrowRightIcon size={13} />
                      </span>
                      <span className="c-read-time">Təxmini oxuma: 2 dəq</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Closing />
    </SiteShell>
  );
}
