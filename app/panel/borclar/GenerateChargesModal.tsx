"use client";

import { useState } from "react";
import { ApiError } from "../../lib/api/client";
import { generateChargesForPeriod, type GenerateChargesResult } from "../../lib/api/payments";
import { Modal } from "../Modal";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

/** Backend-in {"error": "...", "code": "..."} cavabından oxunaqlı mətn çıxarır. */
function errorText(err: unknown): string {
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

/**
 * Buraxılmış və ya natamam dövr üçün borcları əl ilə yaradır (adətən API dayandığı gün planlı iş işləməyəndə).
 * Əməliyyat təkrar basılsa belə zərərsizdir: yalnız hələ borcu olmayan mənzil/qaraj/xidmətlərə borc yaradır,
 * ləğv edilmiş borcun əmlakı üçün isə yenidən yaradır.
 */
export function GenerateChargesModal({
  accessToken,
  onClose,
  onDone,
}: {
  accessToken: string;
  onClose: () => void;
  /** Uğurlu icradan sonra siyahını yeniləmək üçün */
  onDone: () => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateChargesResult | null>(null);

  const period = `${year}-${String(month).padStart(2, "0")}`;
  const periodLabel = `${MONTHS[month - 1]} ${year}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      setResult(await generateChargesForPeriod(accessToken, period));
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const created = result ? result.residentChargesCreated + result.vendorChargesCreated : 0;
  const skippedNoRate = result ? result.apartmentsSkippedNoRate + result.garagesSkippedNoRate : 0;

  return (
    <Modal title="Dövr üçün borcları yarat" onClose={onClose}>
      {!result ? (
        <form onSubmit={handleSubmit}>
          <p className="hr-note" style={{ margin: "0 0 14px" }}>
            Seçilmiş ay üçün hələ borcu olmayan mənzil, qaraj və müqavilə xidmətlərinə borc yaradılır. Artıq borcu
            olanlara toxunulmur, ona görə əməliyyatı təkrar etmək zərərsizdir. Ləğv edilmiş borcun əmlakı üçün borc
            yenidən yaradılır.
          </p>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="gen-month">Ay</label>
              <select id="gen-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="gen-year">İl</label>
              <input
                id="gen-year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={onClose}>
              Ləğv et
            </button>
            <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
              {saving ? "Yaradılır…" : `${periodLabel} üçün yarat`}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="cal-notice" role="status" style={{ marginBottom: 12 }}>
            <span>
              <strong>{periodLabel}</strong> dövrü üçün {created} borc yaradıldı.
            </span>
          </div>

          <div className="hr-kv">
            <div className="hr-kv-item">
              <span className="hr-kv-label">Sakin borcları</span>
              <span className="hr-kv-value">{result.residentChargesCreated}</span>
            </div>
            <div className="hr-kv-item">
              <span className="hr-kv-label">Tədarükçü borcları</span>
              <span className="hr-kv-value">{result.vendorChargesCreated}</span>
            </div>
          </div>

          {created === 0 && skippedNoRate === 0 && (
            <p className="hr-note">Bu dövr üçün bütün borclar artıq yaradılıb, yeni borc lazım olmadı.</p>
          )}

          {skippedNoRate > 0 && (
            <p className="ledger-alert" role="alert">
              Tarif tapılmadığı üçün borc yazılmayanlar: {result.apartmentsSkippedNoRate} mənzil
              {result.garagesSkippedNoRate > 0 ? `, ${result.garagesSkippedNoRate} qaraj` : ""}. Tarifi əlavə edib
              əməliyyatı təkrar edin.
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="panel-btn panel-btn-primary" onClick={onClose}>
              Bağla
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
