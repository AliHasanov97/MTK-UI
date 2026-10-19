"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  createArticle,
  deleteArticleFile,
  downloadArticleFile,
  formatFileSize,
  publishArticle,
  updateArticle,
  uploadArticleFile,
  type Article,
  type ArticleAttachment,
} from "../../lib/api/articles";
import { Modal } from "../Modal";
import { BBCodeEditor } from "../../components/BBCodeEditor";

// Backend (ArticleConfiguration, AddFileAttachmentCommandHandler) limitləri
const TITLE_MAX = 500;
const SUMMARY_MAX = 1000;
const FILE_MAX_BYTES = 20 * 1024 * 1024;

type PendingFile = { file: File };

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    try {
      const body = JSON.parse(err.message) as { error?: string };
      if (body.error) return body.error;
    } catch {
      /* mətn JSON deyil */
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function ArticleFormModal({
  article,
  onClose,
  onSaved,
}: {
  /** null — yeni xəbər */
  article: Article | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [existing, setExisting] = useState<ArticleAttachment[]>(article?.fileAttachments ?? []);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  // Xəbər yaradılıb, amma fayl yüklənməsi uğursuz olubsa, təkrar "saxla" yenisini yox, həmin xəbəri yeniləsin.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;
  const articleId = article?.id ?? createdId;
  const isNew = article === null;
  const valid = title.trim() && summary.trim() && content.trim();

  // Yaradılmış və ya faylı silinmiş olsa, siyahı köhnəlməsin deyə bağlananda yenilənir.
  const close = () => (dirty ? onSaved() : onClose());

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const tooBig = Array.from(list).filter((f) => f.size > FILE_MAX_BYTES);
    const ok = Array.from(list).filter((f) => f.size <= FILE_MAX_BYTES);
    setError(tooBig.length ? `“${tooBig[0].name}” çox böyükdür (maksimum 20 MB).` : null);
    setPending((prev) => [...prev, ...ok.map((file) => ({ file }))]);
  }

  async function removeExisting(file: ArticleAttachment) {
    setBusyFileId(file.id);
    setError(null);
    try {
      await deleteArticleFile(accessToken, file.id);
      setExisting((prev) => prev.filter((f) => f.id !== file.id));
      setDirty(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyFileId(null);
      setConfirmDeleteId(null);
    }
  }

  async function download(file: ArticleAttachment) {
    setBusyFileId(file.id);
    setError(null);
    try {
      await downloadArticleFile(accessToken, file.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyFileId(null);
    }
  }

  async function save(publish: boolean) {
    setSaving(true);
    setError(null);
    const input = {
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      fileAttachmentIds: existing.map((f) => f.id),
    };

    try {
      let id = articleId;
      if (!id) {
        id = (await createArticle(accessToken, input)).id;
        setCreatedId(id);
        setDirty(true);
      } else {
        await updateArticle(accessToken, id, input);
      }

      // Fayllar xəbər yaradıldıqdan sonra bir-bir yüklənir; uğurlular siyahıdan çıxarılır.
      for (const item of pending) {
        try {
          const uploaded = await uploadArticleFile(accessToken, id, item.file);
          setExisting((prev) => [...prev, uploaded]);
          setPending((prev) => prev.filter((p) => p !== item));
          setDirty(true);
        } catch (err) {
          setError(`Xəbər saxlanıldı, amma “${item.file.name}” yüklənmədi: ${errorMessage(err)}`);
          setSaving(false);
          return;
        }
      }

      if (publish) await publishArticle(accessToken, id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Yeni xəbər" : "Xəbəri redaktə et"} wide onClose={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <div className="form-field">
          <label htmlFor="art-title">Başlıq</label>
          <input id="art-title" required autoFocus maxLength={TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="art-summary">Qısa məzmun</label>
          <textarea
            id="art-summary"
            required
            rows={2}
            maxLength={SUMMARY_MAX}
            placeholder="Siyahıda və ana səhifədə göstərilən 1–2 cümlə"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <span className="ap-sub">
            {summary.length}/{SUMMARY_MAX}
          </span>
        </div>
        <div className="form-field">
          <label htmlFor="art-content">Mətn</label>
          <BBCodeEditor id="art-content" required rows={12} value={content} onChange={setContent} />
        </div>
        <p className="ap-sub">Şəkli mətnin içinə qoymaq üçün alətlər zolağındakı “Şəkil” düyməsindən istifadə edin (şəklin ünvanı ilə).</p>

        <div className="form-field">
          <label>Əlavə fayllar</label>

          {existing.length > 0 && (
            <ul className="art-files">
              {existing.map((f) => (
                <li key={f.id}>
                  <span aria-hidden="true">📎</span>
                  <span className="art-file-name">{f.fileName}</span>
                  <span className="art-file-actions">
                    {confirmDeleteId === f.id ? (
                      <>
                        <span className="ap-sub">Silinsin?</span>
                        <button type="button" className="panel-btn panel-btn-sm art-danger" disabled={busyFileId === f.id} onClick={() => removeExisting(f)}>
                          Bəli
                        </button>
                        <button type="button" className="panel-btn panel-btn-sm" onClick={() => setConfirmDeleteId(null)}>
                          Xeyr
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="panel-btn panel-btn-sm" disabled={busyFileId === f.id} onClick={() => download(f)}>
                          Endir
                        </button>
                        <button type="button" className="panel-btn panel-btn-sm art-danger" disabled={busyFileId === f.id} onClick={() => setConfirmDeleteId(f.id)}>
                          Sil
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {pending.length > 0 && (
            <ul className="art-files art-files-pending">
              {pending.map((p, i) => (
                <li key={`${p.file.name}-${i}`}>
                  <span aria-hidden="true">⬆</span>
                  <span className="art-file-name">{p.file.name}</span>
                  <span className="ap-sub">{formatFileSize(p.file.size)}</span>
                  <span className="art-file-actions">
                    <button type="button" className="panel-btn panel-btn-sm" disabled={saving} onClick={() => setPending((prev) => prev.filter((x) => x !== p))}>
                      Çıxar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {existing.length === 0 && pending.length === 0 && <p className="art-files-empty">Bu xəbərə fayl əlavə olunmayıb.</p>}

          <div className="art-file-add">
            <label className="panel-btn panel-btn-sm art-file-pick">
              + Fayl əlavə et
              <input
                type="file"
                multiple
                style={{ display: "none" }}
                disabled={saving}
                onChange={(e) => {
                  pickFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <span className="ap-sub">
            Maksimum 20 MB. {isNew ? "Fayllar xəbər saxlanılanda yüklənir." : "Fayllar “Yadda saxla” basılanda yüklənir."} Xəbərə əlavə olunan bütün fayllar ictimaidir: saytda hər kəs endirə bilər.
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={close} disabled={saving}>
            {dirty ? "Bağla" : "Ləğv et"}
          </button>
          {isNew && !createdId ? (
            <>
              <button type="submit" className="panel-btn" disabled={saving || !valid}>
                Qaralama kimi saxla
              </button>
              <button type="button" className="panel-btn panel-btn-primary" disabled={saving || !valid} onClick={() => save(true)}>
                {saving ? "Saxlanılır…" : "Saxla və yayımla"}
              </button>
            </>
          ) : (
            <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || !valid}>
              {saving ? "Saxlanılır…" : "Yadda saxla"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
