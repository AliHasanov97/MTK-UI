import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { formatNewsDate, news } from "../news";

export const metadata: Metadata = { title: "Xəbərlər" };

export default function NewsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="XƏBƏRLƏR"
        title={
          <>
            Xəbərlər və <span>elanlar.</span>
          </>
        }
        lead="Sistemdəki yeniliklər və kooperativ elanları."
        crumbs={[{ label: "Xəbərlər" }]}
      />
      <section className="lp-news section-wrap">
        <div className="lp-news-grid">
          {news.map((n) => (
            <Link key={n.slug} href={`/xeberler/${n.slug}`} className="lp-news-card">
              <div className="lp-news-meta">
                <em>{n.category}</em>
                <time dateTime={n.date}>{formatNewsDate(n.date)}</time>
              </div>
              <h3>{n.title}</h3>
              <p>{n.excerpt}</p>
              <span className="text-link">Ətraflı oxu →</span>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
