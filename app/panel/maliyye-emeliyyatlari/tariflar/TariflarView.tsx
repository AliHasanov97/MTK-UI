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
  type RateResponse,
  type RateTypeKey,
} from "../../../lib/api/payments";
import { Modal } from "../../Modal";
import { useCreatedByMap } from "../../binalar/finance";
import { DateInput } from "../../../components/DateInput";

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

type RateGroup = {
  key: string;
  current: RateResponse | null;
  upcoming: RateResponse[];
  // Older rates, newest first.
  history: RateResponse[];
};

function rateKey(rate: RateResponse): string {
  return `${rateTypeFromOrdinal(rate.rateType)}:${rate.garageType ?? ""}`;
}

function rateLabel(rate: RateResponse): string {
  return rateTypeFromOrdinal(rate.rateType) === "FixedGarage"
    ? `Qaraj — ${garageTypeLabel(rate)}`
    : "Mənzil — m² üzrə";
}

function rateUnit(rate: RateResponse): string {
  return rateTypeFromOrdinal(rate.rateType) === "FixedGarage" ? "qaraj" : "m²";
}

function groupRates(rates: RateResponse[]): RateGroup[] {
  const now = new Date().toISOString();
  const byKey = new Map<string, RateResponse[]>();
  for (const r of rates) {
    const list = byKey.get(rateKey(r));
    if (list) list.push(r);
    else byKey.set(rateKey(r), [r]);
  }
  return Array.from(byKey.entries())
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
      const upcoming = sorted.filter((r) => r.effectiveFrom > now);
      const past = sorted.filter((r) => r.effectiveFrom <= now);
      return { key, current: past[0] ?? null, upcoming, history: past.slice(1) };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function RateCard({ group, createdBy }: { group: RateGroup; createdBy: Record<string, string> }) {
  const head = group.current ?? group.upcoming[group.upcoming.length - 1];
  if (!head) return null;
  const unit = rateUnit(head);

  // A rate is in force until the next-newer rate starts.
  const timeline = [...group.upcoming, ...(group.current ? [group.current] : []), ...group.history];

  return (
    <div className="panel-card">
      <h3>{rateLabel(head)}</h3>
      {group.current ? (
        <>
          <p style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px" }}>
            {group.current.amount.toFixed(2)} ₼ <span style={{ fontSize: 13, fontWeight: 500 }}>/ {unit}</span>
          </p>
          <p>{group.current.effectiveFrom.slice(0, 10)} tarixindən tətbiq olunur</p>
          {group.current.description && <p>{group.current.description}</p>}
        </>
      ) : (
        <p>Hələ qüvvədə olan tarif yoxdur.</p>
      )}

      {group.upcoming.map((r) => (
        <p key={r.id} style={{ marginTop: 10 }}>
          <span className="panel-role-tag panel-role-tag-warn">Gələcəkdə</span>{" "}
          {r.effectiveFrom.slice(0, 10)} tarixindən: <b>{r.amount.toFixed(2)} ₼ / {unit}</b>
        </p>
      ))}

      {group.history.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6d7973" }}>
            Tarixçə ({group.history.length})
          </summary>
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, fontSize: 12, color: "#5a655d" }}>
            {timeline.slice(timeline.length - group.history.length).map((r) => {
              const idx = timeline.indexOf(r);
              const newer = idx > 0 ? timeline[idx - 1] : null;
              return (
                <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
                  <span>
                    {r.effectiveFrom.slice(0, 10)} — {newer ? newer.effectiveFrom.slice(0, 10) : "…"}
                  </span>
                  <span>
                    {r.amount.toFixed(2)} ₼ / {unit}
                    {createdBy[r.id] ? ` · ${createdBy[r.id]}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

export function TariflarView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [rates, setRates] = useState<RateResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const createdBy = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "Rate");

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

  const groups = groupRates(rates);

  return (
    <div className="panel-page">
      <div className="panel-toolbar">
        <div style={{ flex: 1 }}>
          <h1>Tariflər</h1>
          <p className="panel-page-lead">
            Aylıq haqq generasiyası bu tariflərə əsaslanır: mənzillər üçün m² üzrə, qarajlar üçün sabit (istəyə görə
            qaraj növünə xüsusi).
          </p>
        </div>
        {canManage && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
            + Yeni tarif
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {showCreate && (
        <Modal title="Yeni tarif" onClose={() => setShowCreate(false)}>
          <CreateRateForm
            accessToken={auth.accessToken}
            onCancel={() => setShowCreate(false)}
            onSaved={() => {
              setShowCreate(false);
              load();
            }}
          />
        </Modal>
      )}

      <h4 style={{ margin: "0 0 12px" }}>Hazırkı tariflər</h4>
      {groups.length === 0 ? (
        <p className="panel-page-lead">Hələ heç bir tarif təyin edilməyib.</p>
      ) : (
        <div className="panel-card-grid">
          {groups.map((g) => (
            <RateCard key={g.key} group={g} createdBy={createdBy} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRateForm({
  accessToken,
  onSaved,
  onCancel,
}: {
  accessToken: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
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
          <DateInput
            id="rate-effective-from"
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
        <button type="button" className="panel-btn" onClick={onCancel}>
          Ləğv et
        </button>
        <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
          {saving ? "Saxlanılır…" : "Tarif yarat"}
        </button>
      </div>
    </form>
  );
}
