"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { QueryComparisonType, SortDirection } from "../../lib/api/buildings";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../lib/api/garages";
import { getOwnerById, type Owner, type OwnerListItem } from "../../lib/api/owners";
import {
  CHARGE_STATUS_LABELS,
  chargeStatusFromOrdinal,
  createCharge,
  searchCharges,
  type ChargeResponse,
  type PropertyTypeKey,
} from "../../lib/api/payments";
import { Modal } from "../Modal";
import { OwnerPicker } from "../binalar/OwnerPicker";
import { PayButton } from "../binalar/finance";
import { resolveOwnerNames, resolvePropertyLabels } from "../binalar/resolve";

const PAGE_SIZE = 20;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function BorclarView() {
  const auth = useAuth();
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [propertyLabels, setPropertyLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showAddCharge, setShowAddCharge] = useState(false);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    searchCharges(auth.accessToken, {
      filters: [{ columnName: "Status", comparison: QueryComparisonType.NotEquals, value: "Paid" }],
      sortCriteria: { columnName: "CreatedAt", direction: SortDirection.Descending },
      page: page - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setCharges(res.charges);
        setTotalCount(res.totalCount);
        setError(null);
        return Promise.all([
          resolveOwnerNames(auth.accessToken, res.charges.map((c) => c.ownerId)),
          resolvePropertyLabels(
            auth.accessToken,
            res.charges.map((c) => ({ propertyType: c.propertyType === 0 ? "Apartment" : "Garage", propertyId: c.propertyId })),
          ),
        ]);
      })
      .then((result) => {
        if (!result) return;
        const [owners, properties] = result;
        setOwnerNames((prev) => ({ ...prev, ...owners }));
        setPropertyLabels((prev) => ({ ...prev, ...properties }));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (auth.status !== "authenticated") return null;

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="panel-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1>Borclar</h1>
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowAddCharge(true)}>
          + Yeni haqq
        </button>
      </div>
      <p className="panel-page-lead">Ödənilməmiş və qismən ödənilmiş haqqların siyahısı.</p>

      {error && <p className="form-error">{error}</p>}

      {charges.length === 0 ? (
        <p className="panel-page-lead">Heç bir açıq borc yoxdur.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sahib</th>
                <th>Əmlak</th>
                <th>Dövr</th>
                <th>Təsvir</th>
                <th>Məbləğ (₼)</th>
                <th>Ödənilib (₼)</th>
                <th>Qalıq (₼)</th>
                <th>Status</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => {
                const propertyType: PropertyTypeKey = c.propertyType === 0 ? "Apartment" : "Garage";
                const remaining = c.amount - c.paidAmount;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link className="owner-link" href={`/panel/binalar/sahibler/${c.ownerId}`}>
                        {ownerNames[c.ownerId] ?? "…"}
                      </Link>
                    </td>
                    <td>{propertyLabels[c.propertyId] ?? "…"}</td>
                    <td>{c.period}</td>
                    <td>{c.description ?? "—"}</td>
                    <td>{c.amount.toFixed(2)}</td>
                    <td>{c.paidAmount.toFixed(2)}</td>
                    <td className="owner-balance-tag-debt">{remaining.toFixed(2)}</td>
                    <td>
                      <span className="panel-role-tag">{CHARGE_STATUS_LABELS[chargeStatusFromOrdinal(c.status)]}</span>
                    </td>
                    <td>
                      <PayButton
                        ownerId={c.ownerId}
                        propertyId={c.propertyId}
                        propertyType={propertyType}
                        balance={-remaining}
                        onPaid={load}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {totalCount} borc — səhifə {page}/{pageCount}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Əvvəlki
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCharge && (
        <AddChargeModal
          accessToken={auth.accessToken}
          onClose={() => setShowAddCharge(false)}
          onSaved={() => {
            setShowAddCharge(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddChargeModal({
  accessToken,
  onClose,
  onSaved,
}: {
  accessToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [owner, setOwner] = useState<OwnerListItem | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<Owner | null>(null);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!owner) {
      Promise.resolve().then(() => setOwnerDetail(null));
      return;
    }
    Promise.resolve().then(() => setTarget(""));
    getOwnerById(accessToken, owner.id)
      .then(setOwnerDetail)
      .catch((err) => setError(errorMessage(err)));
  }, [accessToken, owner]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!owner || !target) {
      setError("Sahib və əmlak seçilməlidir.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }
    const [kind, id] = target.split(":");
    setSaving(true);
    setError(null);
    try {
      await createCharge(accessToken, {
        ownerId: owner.id,
        propertyType: kind === "apartment" ? "Apartment" : "Garage",
        propertyId: id,
        amount: numericAmount,
        description,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni haqq əlavə et" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <OwnerPicker selected={owner} onSelect={setOwner} />
        {ownerDetail && (
          <div className="form-field">
            <label htmlFor="charge-target">Əmlak</label>
            <select id="charge-target" value={target} onChange={(e) => setTarget(e.target.value)} required>
              <option value="" disabled>
                Seçin…
              </option>
              {ownerDetail.apartments.map((a) => (
                <option key={a.id} value={`apartment:${a.id}`}>
                  Mənzil {a.apartmentNumber} — {a.building.name}
                </option>
              ))}
              {ownerDetail.garages.map((g) => (
                <option key={g.id} value={`garage:${g.id}`}>
                  Qaraj {g.garageNumber} ({GARAGE_TYPE_LABELS[g.type as GarageTypeKey] ?? g.type})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="charge-amount">Məbləğ (₼)</label>
            <input
              id="charge-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="charge-description">Təsvir (məs. &quot;Zədə haqqı&quot;)</label>
            <input
              id="charge-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={!owner || !target || saving}>
            {saving ? "Saxlanılır…" : "Əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
