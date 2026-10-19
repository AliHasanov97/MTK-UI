"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { getCompany, upsertCompany, type CompanyResponse } from "../../lib/api/payments";
import { useIsAdmin } from "../../lib/auth/roles";
import "./company-profile.css";

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
  // Profil əvvəlcə oxu rejimində açılır; "Redaktə et" ilə dəyişdirilir. Profil hələ yoxdursa birbaşa yaratma formasıdır.
  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState({ name: "", director: "", address: "" });

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getCompany(auth.accessToken)
      .then((c) => {
        setName(c.name);
        setDirector(c.director ?? "");
        setAddress(c.address);
        setSnapshot({ name: c.name, director: c.director ?? "", address: c.address });
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
      setSnapshot({ name: updated.name, director: updated.director ?? "", address: updated.address });
      setNotFound(false);
      setSaved(true);
      setEditing(false);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  // Həqiqi xəta (404/"not found" xaric) — formu göstərmədən bloklayırıq.
  const blockingError = !loaded ? null : error;
  // Yeni profil yaradılarkən redaktə rejimi həmişə açıqdır.
  const isEditing = canManage && (isNew || editing);

  function startEdit() {
    setSaved(false);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setName(snapshot.name);
    setDirector(snapshot.director);
    setAddress(snapshot.address);
    setError(null);
    setEditing(false);
  }

  return (
    <section className="company-card">
      <header className="company-head">
        <span className="company-avatar" aria-hidden="true">
          ⌂
        </span>
        <div>
          <h2>Şirkət profili</h2>
          <p>
            Bu rekvizitlər əmək haqqı qəbzi, ödəniş qəbzi və əmr PDF-lərində, həmçinin saytın başlığında və altlığında
            göstərilir.
          </p>
        </div>
      </header>

      {!loaded ? (
        <p className="company-state">Yüklənir…</p>
      ) : blockingError && !canManage ? (
        <p className="form-error company-state">{blockingError}</p>
      ) : (
        <div className="company-body">
          {isNew && (
            <div className="company-notice">
              <strong>Şirkət profili hələ qurulmayıb</strong>
              <span>
                {canManage
                  ? "Aşağıdakı məlumatları doldurub profili yaradın."
                  : "Profili qurmaq üçün admin ilə əlaqə saxlayın."}
              </span>
            </div>
          )}

          {(canManage || !isNew) && (
            <>
              <form onSubmit={handleSubmit} className="company-form">
                {isEditing ? (
                  <>
                    <div className="form-field wide">
                      <label htmlFor="company-name">Şirkət adı</label>
                      <input
                        id="company-name"
                        required
                        autoFocus={!isNew}
                        maxLength={300}
                        placeholder="Məs: Vahid MTK"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="company-director">Direktor</label>
                      <input
                        id="company-director"
                        maxLength={200}
                        placeholder="Ad Soyad Ata adı"
                        value={director}
                        onChange={(e) => setDirector(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="company-address">Ünvan</label>
                      <input
                        id="company-address"
                        required
                        maxLength={500}
                        placeholder="Küçə, bina"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <dl className="company-view wide">
                    <div className="wide">
                      <dt>Şirkət adı</dt>
                      <dd>{name || "—"}</dd>
                    </div>
                    <div>
                      <dt>Direktor</dt>
                      <dd>{director || "—"}</dd>
                    </div>
                    <div>
                      <dt>Ünvan</dt>
                      <dd>{address || "—"}</dd>
                    </div>
                  </dl>
                )}

                {error && <p className="form-error wide">{error}</p>}

                {canManage && (
                  <div className="company-actions">
                    {saved && !isEditing && <span className="company-saved">✓ Dəyişikliklər saxlanıldı</span>}
                    {isEditing ? (
                      <>
                        {!isNew && (
                          <button type="button" className="panel-btn" onClick={cancelEdit} disabled={saving}>
                            Ləğv et
                          </button>
                        )}
                        <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
                          {saving ? "Saxlanılır…" : isNew ? "Profili yarat" : "Yadda saxla"}
                        </button>
                      </>
                    ) : (
                      <button type="button" className="panel-btn panel-btn-primary" onClick={startEdit}>
                        Redaktə et
                      </button>
                    )}
                  </div>
                )}
              </form>

              <aside className="company-preview" aria-label="Sənəddə görünüş">
                <small>SƏNƏDDƏ BELƏ GÖRÜNƏCƏK</small>
                <div className="company-doc">
                  <strong>{name.trim() || "Şirkət adı"}</strong>
                  <span>{address.trim() || "Ünvan"}</span>
                  <hr />
                  <span className="company-doc-row">
                    Direktor: <b>{director.trim() || "—"}</b>
                  </span>
                </div>
              </aside>
            </>
          )}
        </div>
      )}
    </section>
  );
}
