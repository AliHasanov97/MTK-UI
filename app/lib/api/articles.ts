import { apiFetch, apiFetchFile, apiUploadFile, saveBlobAsFile } from "./client";
import { apiConfig } from "./config";
import { QueryComparisonType, SortDirection, type QueryFilter } from "./buildings";

/** Backend: MTK.Modules.Communications (api/communications/articles). */

type Envelope<T> = { data: T; message: string };

export type ArticleStatus = "Draft" | "Published" | "Archived";

/** Backend FileAttachmentResponse (Communications). Yükləmə/endirmə endpoint-i hələ backend-də yoxdur. */
export type ArticleAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  isPublic: boolean;
};

export type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  viewCount: number;
  createdByFullName: string;
  fileAttachments: ArticleAttachment[];
};

/** Axtarış siyahısının elementi: mətn və fayl siyahısı yoxdur, əvəzində fayl sayı var. */
export type ArticleListItem = Omit<Article, "content" | "fileAttachments"> & { fileAttachmentCount: number };

/** Backend PagedListResponse: { data, page, pageSize, pageCount, totalCount } */
export type ArticlesPage = {
  data: ArticleListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ArticleInput = {
  title: string;
  summary: string;
  content: string;
  /** Backend qəbul edir, amma hələ istifadə etmir; redaktədə mövcud fayllar silinməsin deyə ötürülür. */
  fileAttachmentIds?: string[];
};

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  Draft: "Qaralama",
  Published: "Yayımlanıb",
  Archived: "Arxivdə",
};

// ---------- Public (token tələb etmir: landing və paneldə oxu) ----------

async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(new URL(path, apiConfig.baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return ((await res.json()) as Envelope<T>).data;
  } catch {
    return null;
  }
}

/** Son yayımlanmış xəbərlər (yeni → köhnə). Backend əlçatmazdırsa boş siyahı. */
export async function getLatestArticles(count = 5): Promise<Article[]> {
  return (await publicGet<Article[]>(`api/communications/articles/latest?count=${count}`)) ?? [];
}

/**
 * Tək xəbər (hər oxunuşda baxış sayı artır). Backend bu endpoint-də statusu yoxlamır,
 * ona görə yalnız yayımlanmış xəbər qaytarılır — qaralama və arxiv burada gizlədilir.
 */
export async function getPublishedArticle(id: string): Promise<Article | null> {
  const article = await publicGet<Article>(`api/communications/articles/${id}`);
  return article && article.status === "Published" ? article : null;
}

// ---------- Admin ----------

/** Admin siyahısı: POST articles/search (filtr, sort, səhifələmə, tam mətn axtarışı). */
export function searchArticles(
  accessToken: string,
  params: { page: number; pageSize: number; status?: ArticleStatus; searchTerm?: string },
) {
  const filters: QueryFilter[] = [];
  if (params.status) filters.push({ columnName: "Status", comparison: QueryComparisonType.Equals, value: params.status });

  return apiFetch<Envelope<ArticlesPage>>("api/communications/articles/search", accessToken, {
    method: "POST",
    body: JSON.stringify({
      filters: filters.length ? filters : null,
      sortCriteria: { columnName: "CreatedAt", direction: SortDirection.Descending },
      searchTerm: params.searchTerm?.trim() || null,
      page: params.page,
      pageSize: params.pageSize,
    }),
  }).then((e) => e.data);
}

/** Redaktə üçün tam xəbər (siyahıda mətn yoxdur). Qaralamanı da qaytarır; baxış sayı artır. */
export async function getArticleForEdit(id: string): Promise<Article | null> {
  return publicGet<Article>(`api/communications/articles/${id}`);
}

export function createArticle(accessToken: string, input: ArticleInput) {
  return apiFetch<Envelope<{ id: string }>>("api/communications/articles", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((e) => e.data);
}

export function updateArticle(accessToken: string, id: string, input: ArticleInput) {
  return apiFetch<unknown>(`api/communications/articles/${id}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ id, ...input }),
  });
}

export function publishArticle(accessToken: string, id: string) {
  return apiFetch<unknown>(`api/communications/articles/${id}/publish`, accessToken, { method: "POST" });
}

export function deleteArticle(accessToken: string, id: string) {
  return apiFetch<unknown>(`api/communications/articles/${id}`, accessToken, { method: "DELETE" });
}

// ---------- Fayllar (api/communications/fileattachments) ----------

/** Xəbərə fayl yüklə. Xəbər əvvəlcədən yaradılmış olmalıdır. */
export function uploadArticleFile(accessToken: string, articleId: string, file: File) {
  const formData = new FormData();
  formData.append("File", file);
  formData.append("ArticleId", articleId);
  // Xəbər ictimaidir, ona görə onun faylları da həmişə açıqdır (landing-də endirilə bilməlidir).
  formData.append("IsPublic", "true");
  return apiUploadFile<Envelope<ArticleAttachment>>("api/communications/fileattachments", accessToken, formData).then(
    (e) => e.data,
  );
}

export function deleteArticleFile(accessToken: string, fileId: string) {
  return apiFetch<unknown>(`api/communications/fileattachments/${fileId}`, accessToken, { method: "DELETE" });
}

/** Admin üçün endirmə (token ilə) — daxili (IsPublic=false) fayllar da işləyir. */
export async function downloadArticleFile(accessToken: string, fileId: string) {
  const { blob, fileName } = await apiFetchFile(`api/communications/fileattachments/${fileId}/download`, accessToken);
  saveBlobAsFile(blob, fileName);
}

/** Açıq fayllar üçün birbaşa endirmə linki (landing-də, girişsiz). */
export function publicArticleFileUrl(fileId: string) {
  return new URL(`api/communications/fileattachments/${fileId}/download`, apiConfig.baseUrl).toString();
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------- Format ----------

export function formatArticleDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("az-AZ", { day: "numeric", month: "long", year: "numeric" });
}

/** Mətni abzaslara bölür (boş sətirlə ayrılmış bloklar). */
export function articleParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
