"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { getCompany, upsertCompany, type CompanyResponse } from "../../lib/api/payments";
import { useIsAdmin } from "../../lib/auth/roles";

/** Backend-in {"error": "...", "code": "..."} cavabından oxunaqlı mətn və kod çıxarır. */
function parseApiError(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return { message: "Bu əməliyyat yalnız idarəçi (admin) üçündür." };
    try {
      const body = JSON.parse(err.message) as { error?: string; code?: string };
      if (body.error) return { message: body.error, code: body.code };
    } catch {
      /* mətn JSON deyil */
    }
    return { message: `Backend xətası (${err.status}): ${err.message}` };
  }
  return { message: "Backend-ə qoşulmaq mümkün olmadı." };
}

export function CompanyProfileView() {
  const auth = useAuth();
  const canManage = useIsAdmin();
  const [loaded, setLoaded] = useState(false);
  // "Company.NotFound" — profil hələ qurulmayıb; bu, əsl xəta deyil, yaratma formasını göstərmək üçün siqnaldır.
  const [notFound, setNotFound] = useState(false);
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
        setName(c.name);
        setDirector(c.director ?? "");
        setAddress(c.address);
        setNotFound(false);
        setError(null);
      })
      .catch((err) => {
        const { message, code } = parseApiError(err);
        if (code === "Company.NotFound") {
          setNotFound(true);
          setError(null);
        } else {
          setError(message);
        }
      })
      .finally(() => setLoaded(true));
  }, [auth]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;
  const isNew = notFound;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated: CompanyResponse = await upsertCompany(accessToken, {
        name: name.trim(),
        director: director.trim() || null,
        address: address.trim(),
      });
      setName(updated.name);
      setDirector(updated.director ?? "");
      setAddress(updated.address);
      setNotFound(false);
      setSaved(true);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  // Həqiqi xəta (404/"not found" xaric) — formu göstərmədən bloklayırıq.
  const blockingError = !loaded ? null : error;

  return (
    <section className="hr-section">
      <h3 className="hr-section-title">Şirkət profili</h3>
      <p className="hr-note">
        Bu rekvizitlər mühasibatlıq modulunda saxlanılır və HR-a shadow kimi sinxronlaşır — əmək haqqı qəbzi, ödəniş
        qəbzi və əmr PDF-lərində şirkət adı/ünvanı/direktoru buradan götürülür.
      </p>

      {!loaded ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : blockingError && !canManage ? (
        <p className="form-error">{blockingError}</p>
      ) : (
        <>
          {isNew && (
            <div className="hr-empty">
              <strong>Şirkət profili hələ qurulmayıb</strong>
              <span>
                {canManage
                  ? "Aşağıdaki məlumatları doldurub profili yaradın."
                  : "Profili qurmaq üçün admin ilə əlaqə saxlayın."}
              </span>
            </div>
          )}

          {(canManage || !isNew) && (
            <form onSubmit={handleSubmit} style={{ maxWidth: 520, marginTop: isNew ? 16 : 0 }}>
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
              {saved && <p className="hr-note">Şirkət profili {isNew ? "yaradıldı" : "yeniləndi"} ✓</p>}

              {canManage && (
                <div className="form-actions">
                  <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
                    {saving ? "Saxlanılır…" : isNew ? "Profili yarat" : "Yadda saxla"}
                  </button>
                </div>
              )}
            </form>
          )}
        </>
      )}
    </section>
  );
}
