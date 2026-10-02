"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../../lib/api/garages";
import {
  RATE_TYPE_LABELS,
  createRate,
  getCurrentRates,
  rateTypeFromOrdinal,
  updateRate,
  type RateResponse,
  type RateTypeKey,
} from "../../../lib/api/payments";

// Manual is a snapshot-only marker used for one-off charges (see Charge.RateType) —
// it isn't a subscribable rate an admin configures, so it's left out of the form.
const CREATABLE_RATE_TYPES: RateTypeKey[] = ["PerSquareMeter", "FixedGarage"];
const GARAGE_TYPES: GarageTypeKey[] = ["OpenParking", "CoveredGarage", "Storage"];

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function garageTypeLabel(rate: RateResponse): string {
  if (rate.garageType === null) return "Bütün növlər (defolt)";
  return GARAGE_TYPE_LABELS[GARAGE_TYPES[rate.garageType]] ?? "—";
}

export function TariflarView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [rates, setRates] = useState<RateResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getCurrentRates(auth.accessToken)
      .then((res) => {
        setRates(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  if (auth.status !== "authenticated") return null;

  return (
    <div className="panel-page">
      <h1>Tariflər</h1>
      <p className="panel-page-lead">
        Aylıq haqq generasiyası bu tariflərə əsaslanır: mənzillər üçün m² üzrə, qarajlar üçün sabit (istəyə görə
        qaraj növünə xüsusi).
      </p>

      {error && <p className="form-error">{error}</p>}

      {canManage && (
        <section className="panel-card owner-section-card">
          <h4>Yeni tarif</h4>
          <CreateRateForm accessToken={auth.accessToken} onSaved={load} />
        </section>
      )}

      <section className="panel-card owner-section-card">
        <h4>Aktiv tariflər</h4>
        {rates.length === 0 ? (
          <p className="panel-page-lead">Hələ heç bir tarif təyin edilməyib.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tip</th>
                  <th>Qaraj növü</th>
                  <th>Məbləğ (₼)</th>
                  <th>Qüvvəyə minib</th>
                  <th>Təsvir</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) =>
                  canManage && editingId === r.id ? (
                    <EditRateRow
                      key={r.id}
                      accessToken={auth.accessToken}
                      rate={r}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        load();
                      }}
                    />
                  ) : (
                    <tr key={r.id}>
                      <td>{RATE_TYPE_LABELS[rateTypeFromOrdinal(r.rateType)]}</td>
                      <td>{rateTypeFromOrdinal(r.rateType) === "FixedGarage" ? garageTypeLabel(r) : "—"}</td>
                      <td>{r.amount.toFixed(2)}</td>
                      <td>{r.effectiveFrom.slice(0, 10)}</td>
                      <td>{r.description ?? "—"}</td>
                      <td>
                        {canManage && (
                          <button type="button" className="panel-btn panel-btn-sm" onClick={() => setEditingId(r.id)}>
                            Redaktə et
                          </button>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CreateRateForm({ accessToken, onSaved }: { accessToken: string; onSaved: () => void }) {
  const [rateType, setRateType] = useState<RateTypeKey>("PerSquareMeter");
  const [garageType, setGarageType] = useState<GarageTypeKey | "">("");
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createRate(accessToken, {
        rateType,
        amount: numericAmount,
        effectiveFrom,
        description: description || null,
        garageType: rateType === "FixedGarage" && garageType ? garageType : null,
      });
      setAmount("");
      setDescription("");
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="rate-type">Tip</label>
          <select
            id="rate-type"
            value={rateType}
            onChange={(e) => {
              setRateType(e.target.value as RateTypeKey);
              setGarageType("");
            }}
          >
            {CREATABLE_RATE_TYPES.map((key) => (
              <option key={key} value={key}>
                {RATE_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        {rateType === "FixedGarage" && (
          <div className="form-field">
            <label htmlFor="rate-garage-type">Qaraj növü</label>
            <select id="rate-garage-type" value={garageType} onChange={(e) => setGarageType(e.target.value as GarageTypeKey | "")}>
              <option value="">Bütün növlər (defolt)</option>
              {GARAGE_TYPES.map((key) => (
                <option key={key} value={key}>
                  {GARAGE_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="rate-amount">Məbləğ (₼)</label>
          <input
            id="rate-amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="rate-effective-from">Qüvvəyə minmə tarixi</label>
          <input
            id="rate-effective-from"
            type="date"
            required
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="rate-description">Təsvir</label>
        <input id="rate-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
          {saving ? "Saxlanılır…" : "Tarif yarat"}
        </button>
      </div>
    </form>
  );
}

function EditRateRow({
  accessToken,
  rate,
  onCancel,
  onSaved,
}: {
  accessToken: string;
  rate: RateResponse;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(rate.amount));
  const [description, setDescription] = useState(rate.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRate(accessToken, rate.id, { amount: numericAmount, description: description || null });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? `Xəta (${err.status})` : "Backend-ə qoşulmaq mümkün olmadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>{RATE_TYPE_LABELS[rateTypeFromOrdinal(rate.rateType)]}</td>
      <td>{rateTypeFromOrdinal(rate.rateType) === "FixedGarage" ? garageTypeLabel(rate) : "—"}</td>
      <td>
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: 100 }}
        />
      </td>
      <td>{rate.effectiveFrom.slice(0, 10)}</td>
      <td>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
      </td>
      <td style={{ display: "flex", gap: 6 }}>
        <button type="button" className="panel-btn panel-btn-sm" onClick={onCancel}>
          Ləğv et
        </button>
        <button type="button" className="panel-btn panel-btn-sm panel-btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? "…" : "Saxla"}
        </button>
      </td>
    </tr>
  );
}
