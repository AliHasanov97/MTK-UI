import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "../../components/SiteShell";
import { PageHero } from "../../components/PageHero";
import { BBCode } from "../../components/BBCode";
import { formatArticleDate, getPublishedArticle, publicArticleFileUrl } from "../../lib/api/articles";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function NewsItemPage({ params }: Props) {
  const { id } = await params;
  const article = await getPublishedArticle(id);
  if (!article) notFound();
  // Daxili (IsPublic=false) fayllar saytda göstərilmir; onları yalnız idarəetmə endirə bilir.
  const publicFiles = article.fileAttachments.filter((f) => f.isPublic);

  return (
    <SiteShell>
      <PageHero
        eyebrow={`XƏBƏR · ${formatArticleDate(article.publishedAt ?? article.createdAt)}`}
        title={article.title}
        lead={article.summary}
        crumbs={[{ href: "/xeberler", label: "Xəbərlər" }, { label: article.title }]}
      />
      <article className="lp-prose lp-prose-narrow section-wrap">
        <BBCode source={article.content} />
        {publicFiles.length > 0 && (
          <section className="lp-files" aria-label="Əlavə fayllar">
            <h2>Əlavə fayllar</h2>
            <ul>
              {publicFiles.map((f) => (
                <li key={f.id}>
                  <a href={publicArticleFileUrl(f.id)} download>
                    <span aria-hidden="true">📎</span>
                    <span className="lp-file-name">{f.fileName}</span>
                    {f.mimeType && <small>{f.mimeType.toUpperCase()}</small>}
                    <span className="lp-file-dl">Endir ↓</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {article.createdByFullName && <p className="lp-article-author">Müəllif: {article.createdByFullName}</p>}
        <Link className="text-link" href="/xeberler">
          ← Bütün xəbərlər
        </Link>
      </article>
    </SiteShell>
  );
}
