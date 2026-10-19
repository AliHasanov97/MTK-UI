import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "../../components/SiteShell";
import { PageHero } from "../../components/PageHero";
import { formatNewsDate, getNews, news } from "../../news";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return news.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getNews((await params).slug);
  return { title: item?.title ?? "Xəbər", description: item?.excerpt };
}

export default async function NewsItemPage({ params }: Props) {
  const item = getNews((await params).slug);
  if (!item) notFound();

  return (
    <SiteShell>
      <PageHero
        eyebrow={`${item.category.toUpperCase()} · ${formatNewsDate(item.date)}`}
        title={item.title}
        crumbs={[{ href: "/xeberler", label: "Xəbərlər" }, { label: item.title }]}
      />
      <article className="lp-prose lp-prose-narrow section-wrap">
        {item.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <Link className="text-link" href="/xeberler">
          ← Bütün xəbərlər
        </Link>
      </article>
    </SiteShell>
  );
}
