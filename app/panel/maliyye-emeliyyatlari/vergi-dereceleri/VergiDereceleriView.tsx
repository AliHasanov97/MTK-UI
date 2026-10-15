"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { hasAnyRole, ROLES } from "../../../lib/auth/roleConstants";
import { ApiError } from "../../../lib/api/client";
import {
  createPayrollTaxBracket,
  deactivatePayrollTaxBracket,
  getPayrollTaxBrackets,
  payrollPartyLabel,
  payrollRateTypeLabel,
  type PayrollTaxBracketResponse,
} from "../../../lib/api/payments";
import { Modal } from "../../Modal";

const RATE_TYPES = [
  { value: 1, label: "DSMF" },
  { value: 2, label: "İşsizlikdən sığorta" },
  { value: 3, label: "İcbari tibbi sığorta" },
  { value: 4, label: "Gəlir vergisi" },
];
const PARTIES = [
  { value: 1, label: "İşçi payı" },
  { value: 2, label: "İşəgötürən payı" },
];

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
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

const percent = (rate: number) => `${(rate * 100).toFixed(2).replace(/\.00$/, "")}%`;
const range = (b: PayrollTaxBracketResponse) =>
  b.upperBound === null ? `${b.lowerBound} AZN-dən yuxarı` : `${b.lowerBound} – ${b.upperBound} AZN`;

type Group = {
  key: string;
  rateType: number;
  party: number;
  current: PayrollTaxBracketResponse[];
  upcoming: PayrollTaxBracketResponse[];
  history: PayrollTaxBracketResponse[];
};

function groupBrackets(brackets: PayrollTaxBracketResponse[]): Group[] {
  const now = new Date().toISOString();
  const byKey = new Map<string, PayrollTaxBracketResponse[]>();
  for (const b of brackets) {
    const key = `${b.rateType}:${b.party}`;
    const list = byKey.get(key);
    if (list) list.push(b);
    else byKey.set(key, [b]);
  }

  return Array.from(byKey.entries())
    .map(([key, list]) => {
      const [rateType, party] = key.split(":").map(Number);
      const current = list
        .filter((b) => b.effectiveFrom <= now && (b.effectiveTo === null || b.effectiveTo > now))
        .sort((a, b) => a.lowerBound - b.lowerBound);
      const upcoming = list.filter((b) => b.effectiveFrom > now).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
      const history = list
        .filter((b) => b.effectiveTo !== null && b.effectiveTo <= now)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
      return { key, rateType, party, current, upcoming, history };
    })
    .sort((a, b) => a.rateType - b.rateType || a.party - b.party);
}

export function VergiDereceleriView() {
  const auth = useAuth();
  const canManage = auth.status === "authenticated" && hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.ACCOUNTANT]);
  const [brackets, setBrackets] = useState<PayrollTaxBracketResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getPayrollTaxBrackets(auth.accessToken)
      .then((res) => {
        setBrackets(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleClose(bracket: PayrollTaxBracketResponse) {
    if (!window.confirm(`${payrollRateTypeLabel(bracket.rateType)} / ${payrollPartyLabel(bracket.party)} (${range(bracket)}) pilləsi bugündən bağlansın?`)) return;
    setClosing(bracket.id);
    setError(null);
    try {
      await deactivatePayrollTaxBracket(accessToken, bracket.id, new Date().toISOString().slice(0, 10));
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClosing(null);
    }
  }

  const groups = groupBrackets(brackets);

  return (
    <div className="panel-page">
      <div className="panel-toolbar">
        <div style={{ flex: 1 }}>
          <h1>Vergi və sığorta dərəcələri</h1>
          <p className="panel-page-lead">
            Əmək haqqı hesablamasında istifadə olunan DSMF, işsizlikdən sığorta, icbari tibbi sığorta və gəlir
            vergisi pillələri. Qanun dəyişəndə yeni pillə əlavə edin — köhnəsi avtomatik bağlanır, kod dəyişikliyi
            lazım deyil. Seçilmiş ay üçün heç bir qüvvədə olan pillə tapılmasa, əmək haqqı hesablana bilmir.
          </p>
        </div>
        {canManage && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
            + Yeni dərəcə pilləsi
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {showCreate && (
        <Modal title="Yeni dərəcə pilləsi" onClose={() => setShowCreate(false)}>
          <CreateBracketForm
            accessToken={accessToken}
            onCancel={() => setShowCreate(false)}
            onSaved={() => {
              setShowCreate(false);
              load();
            }}
          />
        </Modal>
      )}

      {groups.length === 0 ? (
        <p className="panel-page-lead">Hələ heç bir dərəcə pilləsi təyin edilməyib.</p>
      ) : (
        <div className="panel-card-grid">
          {groups.map((g) => (
            <div key={g.key} className="panel-card">
              <h3>
                {payrollRateTypeLabel(g.rateType)} — {payrollPartyLabel(g.party)}
              </h3>

              {g.current.length === 0 ? (
                <p>Hazırda qüvvədə olan pillə yoxdur.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                  {g.current.map((b) => (
                    <li
                      key={b.id}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "6px 0", borderBottom: "1px solid #eee" }}
                    >
                      <span>
                        {range(b)} <strong>{percent(b.rate)}</strong>
                        {b.description && <span style={{ display: "block", fontSize: 12, color: "#6d7973" }}>{b.description}</span>}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          className="panel-btn panel-btn-sm panel-btn-danger"
                          disabled={closing === b.id}
                          onClick={() => handleClose(b)}
                        >
                          {closing === b.id ? "…" : "Bağla"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {g.upcoming.map((b) => (
                <p key={b.id} style={{ marginTop: 10 }}>
                  <span className="panel-role-tag panel-role-tag-warn">Gələcəkdə</span>{" "}
                  {b.effectiveFrom.slice(0, 10)} tarixindən: {range(b)} — <b>{percent(b.rate)}</b>
                </p>
              ))}

              {g.history.length > 0 && (
                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6d7973" }}>
                    Tarixçə ({g.history.length})
                  </summary>
                  <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, fontSize: 12, color: "#5a655d" }}>
                    {g.history.map((b) => (
                      <li key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
                        <span>
                          {b.effectiveFrom.slice(0, 10)} — {b.effectiveTo?.slice(0, 10)}
                        </span>
                        <span>
                          {range(b)} · {percent(b.rate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateBracketForm({
  accessToken,
  onSaved,
  onCancel,
}: {
  accessToken: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [rateType, setRateType] = useState(1);
  const [party, setParty] = useState(1);
  const [lowerBound, setLowerBound] = useState("0");
  const [hasUpperBound, setHasUpperBound] = useState(true);
  const [upperBound, setUpperBound] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rateValue = Number(ratePercent) / 100;
    if (!ratePercent || rateValue < 0 || rateValue > 1) {
      setError("Faiz 0 ilə 100 arasında olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPayrollTaxBracket(accessToken, {
        rateType,
        party,
        lowerBound: Number(lowerBound) || 0,
        upperBound: hasUpperBound && upperBound ? Number(upperBound) : null,
        rate: rateValue,
        effectiveFrom,
        description: description || null,
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
          <label htmlFor="ptb-type">Dərəcə növü</label>
          <select id="ptb-type" value={rateType} onChange={(e) => setRateType(Number(e.target.value))}>
            {RATE_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="ptb-party">Tərəf</label>
          <select id="ptb-party" value={party} onChange={(e) => setParty(Number(e.target.value))}>
            {PARTIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="ptb-lower">Aşağı həd (AZN)</label>
          <input id="ptb-lower" type="number" min={0} step="0.01" required value={lowerBound} onChange={(e) => setLowerBound(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="ptb-upper">Yuxarı həd (AZN)</label>
          <input
            id="ptb-upper"
            type="number"
            min={0}
            step="0.01"
            disabled={!hasUpperBound}
            value={upperBound}
            onChange={(e) => setUpperBound(e.target.value)}
            placeholder={hasUpperBound ? "" : "sonsuz"}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={!hasUpperBound}
              onChange={(e) => {
                setHasUpperBound(!e.target.checked);
                if (e.target.checked) setUpperBound("");
              }}
            />
            Həddi yoxdur (sonsuzluğa qədər)
          </label>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="ptb-rate">Faiz (%)</label>
          <input id="ptb-rate" type="number" min={0} max={100} step="0.01" required value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="ptb-effective">Qüvvəyə minmə tarixi</label>
          <input id="ptb-effective" type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="ptb-description">Təsvir</label>
        <input id="ptb-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <p className="hr-note">
        Eyni növ/tərəf/aralıq üçün hələ bağlanmamış köhnə pillə varsa, bu, seçilmiş qüvvəyə minmə tarixi ilə
        avtomatik bağlanacaq.
      </p>
      <div className="form-actions">
        <button type="button" className="panel-btn" onClick={onCancel}>
          Ləğv et
        </button>
        <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
          {saving ? "Saxlanılır…" : "Yarat"}
        </button>
      </div>
    </form>
  );
}
