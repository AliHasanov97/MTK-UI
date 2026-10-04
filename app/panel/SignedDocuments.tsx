"use client";

import { useEffect, useState } from "react";
import { ApiError } from "../lib/api/client";
import {
  deleteFileAttachment,
  downloadFileAttachment,
  listFileAttachments,
  uploadFileAttachment,
  type FileAttachmentResponse,
  type FileAttachmentTarget,
} from "../lib/api/fileAttachments";
import { formatDateTime } from "../lib/format";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The "generate the PDF → print it → sign & stamp it → scan it back in" workflow:
 * the Komendant/Xəzinədar downloads the system-generated document (receipt, contract
 * export, …) via the page's own export button, signs the printed copy, then attaches
 * the scan here against the same record. Shared between every detail page that has
 * a PDF export (payment receipt, contract) or that records a source document at
 * creation time (payment, expense, additional income), so the upload/list/delete
 * logic — and its error handling — is written once.
 *
 * Deleting is gated per-item by the backend's own `canDelete` flag (only whoever
 * uploaded a document may remove it again) — `canUpload` only controls the upload
 * button; residents get neither and are download-only.
 */
export function SignedDocumentsPanel({
  accessToken,
  target,
  canUpload,
  onAttachmentsChange,
}: {
  accessToken: string;
  target: FileAttachmentTarget;
  canUpload: boolean;
  onAttachmentsChange?: (attachments: FileAttachmentResponse[]) => void;
}) {
  const [attachments, setAttachments] = useState<FileAttachmentResponse[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Identifies the target by value, not by object identity, so the effect only
  // re-runs when the caller is actually asking about a different record.
  const targetKey = JSON.stringify(target);

  function applyAttachments(list: FileAttachmentResponse[]) {
    setAttachments(list);
    onAttachmentsChange?.(list);
  }

  async function refresh() {
    try {
      applyAttachments(await listFileAttachments(accessToken, target));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    listFileAttachments(accessToken, target)
      .then(applyAttachments)
      .catch((err) => setError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, targetKey]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadFileAttachment(accessToken, file, target);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await downloadFileAttachment(accessToken, id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu sənədi silmək istədiyinizə əminsiniz?")) return;

    setBusyId(id);
    setError(null);
    try {
      await deleteFileAttachment(accessToken, id);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="signed-documents">
      <h5 className="payment-document-section-title">Sənədlər</h5>

      {attachments === null ? (
        <p className="payment-document-statement">Yüklənir…</p>
      ) : attachments.length === 0 ? (
        <p className="payment-document-statement">Hələ sənəd yüklənməyib.</p>
      ) : (
        <ul className="signed-documents-list">
          {attachments.map((a) => (
            <li key={a.id} className="signed-documents-item">
              <span className="signed-documents-name">{a.fileName}</span>
              <span className="signed-documents-meta">
                {formatSize(a.sizeBytes)} · {formatDateTime(a.createdAt)}
              </span>
              <span className="signed-documents-actions">
                <button
                  type="button"
                  className="panel-btn panel-btn-sm"
                  disabled={busyId === a.id}
                  onClick={() => handleDownload(a.id)}
                >
                  Yüklə
                </button>
                {a.canDelete && (
                  <button
                    type="button"
                    className="panel-btn panel-btn-sm panel-btn-danger"
                    disabled={busyId === a.id}
                    onClick={() => handleDelete(a.id)}
                  >
                    Sil
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div className="form-actions" style={{ justifyContent: "flex-start", margin: "8px 0 0" }}>
          <label className="panel-btn panel-btn-sm" style={uploading ? { pointerEvents: "none", opacity: 0.6 } : undefined}>
            {uploading ? "Yüklənir…" : "Sənəd yüklə"}
            <input
              type="file"
              accept="application/pdf,image/*"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
