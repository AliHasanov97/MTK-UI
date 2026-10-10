"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAttachment,
  downloadAttachment,
  getAttachmentBlob,
  listAttachments,
  uploadAttachment,
  type HrFileAttachment,
} from "../../lib/api/hr";
import { formatDateTime } from "../../lib/format";
import { hrErrorMessage } from "./shared";

const MAX_BYTES = 20 * 1024 * 1024;

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];

/** Backend `mimeType` sahəsində fayl uzantısını ("pdf") saxlayır, ona görə növü uzantıdan təyin edirik. */
function previewKind(f: { mimeType: string; fileName: string }): "pdf" | "image" | null {
  const ext = (f.mimeType.includes("/") ? f.mimeType.split("/")[1] : f.mimeType || f.fileName.split(".").pop() || "")
    .toLowerCase()
    .replace(/^\./, "");
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  return null;
}
const previewable = (f: { mimeType: string; fileName: string }) => previewKind(f) !== null;

/**
 * "Sənədi yüklə (PDF) → çap et, imzala və möhürlə → skan edib sistemə yüklə" axını:
 * ərizə/əmrin imzalanmış nüsxəsi həmin qeydə fayl əlavəsi kimi bağlanır.
 */
export function HrSignedDocuments({
  accessToken,
  fkColumn,
  recordId,
  onCountChange,
}: {
  accessToken: string;
  /** FileAttachment cədvəlində bu sənədə bağlanan sütun, məs. "VacationApplicationId" */
  fkColumn: string;
  recordId: string;
  /** Yüklənmiş imzalı sənəd sayı dəyişəndə (sənəd generasiyasını gizlətmək üçün) */
  onCountChange?: (count: number) => void;
}) {
  const [files, setFiles] = useState<HrFileAttachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // "Baxış": sənəd yeni tabda açılır. Tab klik anında (sinxron) açılır ki, brauzer pop-up kimi bloklamasın,
  // fayl yüklənəndən sonra ünvanı təyin olunur.
  async function openInNewTab(f: HrFileAttachment) {
    const tab = window.open("", "_blank");
    if (!tab) {
      setError("Brauzer yeni tabın açılmasını blokladı. Pop-up icazəsi verin və ya “Yüklə” düyməsindən istifadə edin.");
      return;
    }
    try {
      const { blob } = await getAttachmentBlob(accessToken, f.id);
      const kind = previewKind(f);
      const ext = f.mimeType.includes("/") ? f.mimeType.split("/")[1] : f.mimeType;
      const type = kind === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      const url = URL.createObjectURL(new Blob([blob], { type }));
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    } catch (err) {
      tab.close();
      throw err;
    }
  }

  const refresh = useCallback(async () => {
    try {
      const list = await listAttachments(accessToken, fkColumn, recordId);
      setFiles(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(hrErrorMessage(err));
    }
  }, [accessToken, fkColumn, recordId, onCountChange]);

  useEffect(() => {
    listAttachments(accessToken, fkColumn, recordId)
      .then((list) => {
        setFiles(list);
        onCountChange?.(list.length);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, fkColumn, recordId, onCountChange]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Faylın ölçüsü 20 MB-dan çox ola bilməz.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(accessToken, file, fkColumn, recordId);
      await refresh();
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="signed-documents hr-signed">
      <div className="hr-signed-head">
        <div>
          <h5 className="payment-document-section-title">İmzalanmış sənəd</h5>
          <p className="hr-note">Sənədi PDF kimi yükləyin, çap edib imzalayın və skan etdiyiniz nüsxəni bura əlavə edin.</p>
        </div>
        <label className="panel-btn panel-btn-sm panel-btn-primary" style={uploading ? { pointerEvents: "none", opacity: 0.6 } : undefined}>
          {uploading ? "Yüklənir…" : "+ İmzalı sənəd yüklə"}
          <input
            type="file"
            accept="application/pdf,image/*"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </div>

      {files === null ? (
        !error && <p className="hr-note">Yüklənir…</p>
      ) : files.length === 0 ? (
        <p className="hr-note">Hələ imzalanmış sənəd yüklənməyib.</p>
      ) : (
        <ul className="signed-documents-list">
          {files.map((f) => (
            <li key={f.id} className="signed-documents-item">
              <span className="signed-documents-name">
                {previewable(f) ? (
                  <button type="button" className="link-btn" onClick={() => run(f.id, () => openInNewTab(f))}>
                    {f.fileName}
                  </button>
                ) : (
                  f.fileName
                )}
              </span>
              <span className="signed-documents-meta">{formatDateTime(f.createdAt)}</span>
              <span className="signed-documents-actions">
                {previewable(f) && (
                  <button
                    type="button"
                    className="panel-btn panel-btn-sm"
                    disabled={busyId === f.id}
                    onClick={() => run(f.id, () => openInNewTab(f))}
                  >
                    Baxış
                  </button>
                )}
                <button
                  type="button"
                  className="panel-btn panel-btn-sm"
                  disabled={busyId === f.id}
                  onClick={() => run(f.id, () => downloadAttachment(accessToken, f.id))}
                >
                  Yüklə
                </button>
                <button
                  type="button"
                  className="panel-btn panel-btn-sm panel-btn-danger"
                  disabled={busyId === f.id}
                  onClick={() => {
                    if (!window.confirm(`“${f.fileName}” silinsin?`)) return;
                    run(f.id, async () => {
                      await deleteAttachment(accessToken, f.id);
                      await refresh();
                    });
                  }}
                >
                  Sil
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
