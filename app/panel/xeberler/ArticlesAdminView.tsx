"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  ARTICLE_STATUS_LABELS,
  deleteArticle,
  formatArticleDate,
  getArticleForEdit,
  publishArticle,
  searchArticles,
  type Article,
  type ArticleListItem,
  type ArticleStatus,
  type ArticlesPage,
} from "../../lib/api/articles";
import { Modal } from "../Modal";
import { ArticleFormModal } from "./ArticleFormModal";
import "./articles.css";

const PAGE_SIZE = 10;
const STATUSES: ArticleStatus[] = ["Draft", "Published", "Archived"];

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu bölməyə icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function ArticlesAdminView() {
  const auth = useAuth();
  const [status, setStatus] = useState<ArticleStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ArticlesPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const [toDelete, setToDelete] = useState<ArticleListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const accessToken = auth.status === "authenticated" ? auth.accessToken : null;

  // Axtarış sahəsi: yazmağı dayandırandan sonra sorğu göndərilir.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    searchArticles(accessToken, { page, pageSize: PAGE_SIZE, status: status || undefined, searchTerm })
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, status, searchTerm, page, reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  if (auth.status !== "authenticated") return null;
  const token = auth.accessToken;

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Siyahıda mətn yoxdur — redaktə üçün tam xəbər ayrıca yüklənir.
  async function openEdit(item: ArticleListItem) {
    setBusy(true);
    setError(null);
    const full = await getArticleForEdit(item.id);
    setBusy(false);
    if (full) setEditing(full);
    else setError("Xəbər yüklənmədi. Yenidən cəhd edin.");
  }

  return (
    <div className="panel-page">
      <div className="art-head">
        <div>
          <h1>Xəbərlər</h1>
          <p className="panel-page-lead">Xəbər və elanları yaradın, redaktə edin, yayımlayın və silin. Yayımlananlar ictimai saytın “Xəbərlər” səhifəsində və ana səhifədə görünür.</p>
        </div>
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setEditing("new")}>
          + Yeni xəbər
        </button>
      </div>

      <div className="art-tabs">
        <button
          type="button"
          className={status === "" ? "art-tab active" : "art-tab"}
          onClick={() => {
            setStatus("");
            setPage(1);
          }}
        >
          Hamısı
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={status === s ? "art-tab active" : "art-tab"}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {ARTICLE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="panel-toolbar">
        <input
          className="panel-search"
          type="search"
          placeholder="Başlıq və ya məzmun üzrə axtar…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {!result ? (
        !error && <p className="panel-page-lead">Yüklənir…</p>
      ) : result.data.length === 0 ? (
        <div className="data-table-wrap art-empty">
          <strong>Xəbər yoxdur</strong>
          {status || searchTerm ? "Bu süzgəclərə uyğun xəbər tapılmadı." : "İlk xəbəri yaratmaq üçün “+ Yeni xəbər” düyməsini basın."}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Xəbər</th>
                <th>Status</th>
                <th>Müəllif</th>
                <th>Yayım tarixi</th>
                <th>Baxış</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((a) => (
                <tr key={a.id}>
                  <td className="art-cell-title">
                    <strong>{a.title}</strong>
                    <span className="ap-sub">{a.summary}</span>
                    {a.fileAttachmentCount > 0 && <span className="ap-sub">📎 {a.fileAttachmentCount} fayl</span>}
                  </td>
                  <td>
                    <span className={`art-chip art-chip-${a.status}`}>{ARTICLE_STATUS_LABELS[a.status]}</span>
                  </td>
                  <td>{a.createdByFullName || "—"}</td>
                  <td>{a.publishedAt ? formatArticleDate(a.publishedAt) : "—"}</td>
                  <td>{a.viewCount}</td>
                  <td>
                    <div className="data-table-actions">
                      {a.status === "Published" && (
                        <Link className="panel-btn panel-btn-sm" href={`/xeberler/${a.id}`} target="_blank" rel="noopener noreferrer">
                          Bax
                        </Link>
                      )}
                      {a.status === "Draft" && (
                        <button type="button" className="panel-btn panel-btn-sm panel-btn-primary" disabled={busy} onClick={() => runAction(() => publishArticle(token, a.id))}>
                          Yayımla
                        </button>
                      )}
                      <button type="button" className="panel-btn panel-btn-sm" disabled={busy} onClick={() => openEdit(a)}>
                        Redaktə
                      </button>
                      <button type="button" className="panel-btn panel-btn-sm art-danger" disabled={busy} onClick={() => setToDelete(a)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {result.totalCount} xəbər — səhifə {result.page}/{Math.max(1, result.pageCount)}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="panel-btn panel-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Əvvəlki
              </button>
              <button type="button" className="panel-btn panel-btn-sm" disabled={page >= result.pageCount} onClick={() => setPage((p) => p + 1)}>
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <ArticleFormModal
          article={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {toDelete && (
        <Modal title="Xəbəri sil" onClose={() => setToDelete(null)}>
          <p>
            <strong>{toDelete.title}</strong> xəbəri silinsin? Bu əməliyyat geri qaytarılmır.
          </p>
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={() => setToDelete(null)}>
              Ləğv et
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-primary art-danger-solid"
              disabled={busy}
              onClick={async () => {
                const id = toDelete.id;
                setToDelete(null);
                await runAction(() => deleteArticle(token, id));
              }}
            >
              Sil
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
