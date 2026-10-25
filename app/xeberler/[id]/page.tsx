import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "../../components/SiteShell";
import { BBCode } from "../../components/BBCode";
import { ArrowRightIcon } from "../../components/icons";
import { formatArticleDate, getPublishedArticle, publicArticleFileUrl } from "../../lib/api/articles";

type Props = { params: Promise<{ id: string }> };

const IMAGE_FILE_EXTENSION = /\.(avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i;

function isImageAttachment(file: { fileName: string; mimeType: string }) {
  const mimeType = file.mimeType.trim().toLowerCase();
  return mimeType.startsWith("image/") || IMAGE_FILE_EXTENSION.test(file.fileName);
}

export const dynamic = "force-dynamic";

export default async function NewsItemPage({ params }: Props) {
  const { id } = await params;
  const article = await getPublishedArticle(id);
  if (!article) notFound();
  const publicFiles = article.fileAttachments.filter((file) => file.isPublic);
  const imageFiles = publicFiles.filter(isImageAttachment);
  const downloadableFiles = publicFiles.filter((file) => !isImageAttachment(file));
  const publishedAt = article.publishedAt ?? article.createdAt;
  const dateLabel = formatArticleDate(publishedAt);

  return (
    <SiteShell>
      <header className="c-article-head">
        <Link className="c-article-back" href="/xeberler">
          <span aria-hidden="true">←</span> Bütün xəbərlər
        </Link>
        <div className="c-article-kicker">
          <span className="c-article-dot" aria-hidden="true" />
          Xəbərlər
          <span className="c-article-kicker-separator">/</span>
          <time dateTime={publishedAt}>{dateLabel}</time>
        </div>
        <h1>{article.title}</h1>
        {article.summary && <p className="c-article-summary">{article.summary}</p>}
        {article.createdByFullName && (
          <p className="c-article-byline">
            Müəllif <strong>{article.createdByFullName}</strong>
          </p>
        )}
      </header>

      <main className="c-article-layout">
        <article className="c-article-card">
          <BBCode source={article.content} className="c-article-content" />
          {imageFiles.length > 0 && (
            <div className="c-article-images" aria-label="Xəbər şəkilləri">
              {imageFiles.map((file) => (
                <figure className="c-article-image-item" key={file.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicArticleFileUrl(file.id)} alt={file.fileName} loading="lazy" />
                  <figcaption>{file.fileName}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {downloadableFiles.length > 0 && (
            <section className="c-files" aria-label="Əlavə fayllar">
              <div className="c-files-heading">
                <span className="c-files-icon" aria-hidden="true">
                  ↳
                </span>
                <div>
                  <h2>Əlavə fayllar</h2>
                  <p>Xəbərlə bağlı sənədlər və materiallar</p>
                </div>
              </div>
              <ul>
                {downloadableFiles.map((file) => (
                  <li key={file.id}>
                    <a href={publicArticleFileUrl(file.id)} download>
                      <span className="c-file-type" aria-hidden="true">
                        {file.fileName.split(".").pop()?.toUpperCase() ?? "FILE"}
                      </span>
                      <span className="c-file-name">{file.fileName}</span>
                      {file.mimeType && <small>{file.mimeType.toUpperCase()}</small>}
                      <span className="c-file-dl">Endir ↓</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <footer className="c-article-footer">
            <span>MTK · Xəbərlər və elanlar</span>
            <Link href="/xeberler">
              Digər xəbərlərə bax <ArrowRightIcon size={13} />
            </Link>
          </footer>
        </article>
      </main>
    </SiteShell>
  );
}
