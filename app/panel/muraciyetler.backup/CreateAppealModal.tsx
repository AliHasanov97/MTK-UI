"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { createAppeal, AppealCategory, APPEAL_CATEGORY_LABELS } from "../../lib/api/appeals";
import { Modal } from "../Modal";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Müraciət göndərməyə icazəniz yoxdur.";
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

export function CreateAppealModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const auth = useAuth();
  const [category, setCategory] = useState<AppealCategory>(AppealCategory.Maintenance);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await createAppeal(accessToken, { title: title.trim(), description: description.trim(), category });
      onCreated(id);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni müraciət" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="ap-category">Kateqoriya</label>
          <select id="ap-category" value={category} onChange={(e) => setCategory(Number(e.target.value) as AppealCategory)}>
            {Object.entries(APPEAL_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="ap-title">Başlıq</label>
          <input
            id="ap-title"
            required
            autoFocus
            maxLength={TITLE_MAX}
            placeholder="Məs: Liftin işləməməsi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="ap-description">Təsvir</label>
          <textarea
            id="ap-description"
            required
            rows={6}
            maxLength={DESCRIPTION_MAX}
            placeholder="Problemi ətraflı izah edin: harada, nə vaxtdan, nə baş verir…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="ap-sub">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose} disabled={saving}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || !title.trim() || !description.trim()}>
            {saving ? "Göndərilir…" : "Göndər"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
