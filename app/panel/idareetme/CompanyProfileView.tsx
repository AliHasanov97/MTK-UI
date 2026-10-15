"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { getCompany, upsertCompany, type CompanyResponse } from "../../lib/api/payments";
import { useIsAdmin } from "../../lib/auth/roles";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat yalnız idarəçi (admin) üçündür.";
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

export function CompanyProfileView() {
  const auth = useAuth();
  const canManage = useIsAdmin();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [name, setName] = useState("");
  const [director, setDirector] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getCompany(auth.accessToken)
      .then((c) => {
        setCompany(c);
        setName(c.name);
        setDirector(c.director ?? "");
        setAddress(c.address);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await upsertCompany(accessToken, {
        name: name.trim(),
        director: director.trim() || null,
        address: address.trim(),
      });
      setCompany(updated);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="hr-section">
      <h3 className="hr-section-title">Şirkət profili</h3>
      <p className="hr-note">
        Bu rekvizitlər mühasibatlıq modulunda saxlanılır və HR-a shadow kimi sinxronlaşır — əmək haqqı qəbzi, ödəniş
        qəbzi və əmr PDF-lərində şirkət adı/ünvanı/direktoru buradan götürülür.
      </p>

      {!company ? (
        error ? (
          <p className="form-error">{error}</p>
        ) : (
          <p className="panel-page-lead">Yüklənir…</p>
        )
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
          <div className="form-field">
            <label htmlFor="company-name">Şirkət adı</label>
            <input
              id="company-name"
              required
              maxLength={300}
              value={name}
              disabled={!canManage}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="company-director">Direktor</label>
            <input
              id="company-director"
              maxLength={200}
              value={director}
              disabled={!canManage}
              onChange={(e) => setDirector(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="company-address">Ünvan</label>
            <input
              id="company-address"
              required
              maxLength={500}
              value={address}
              disabled={!canManage}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {saved && <p className="hr-note">Şirkət profili yeniləndi ✓</p>}

          {canManage && (
            <div className="form-actions">
              <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
                {saving ? "Saxlanılır…" : "Yadda saxla"}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
