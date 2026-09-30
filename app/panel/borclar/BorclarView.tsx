"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { SortDirection } from "../../lib/api/buildings";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../lib/api/garages";
import { getOwnerById, type Owner, type OwnerListItem } from "../../lib/api/owners";
import {
  CHARGE_STATUS_LABELS,
  chargeStatusFromOrdinal,
  createCharge,
  getChargeAllocations,
  PAYMENT_METHOD_LABELS,
  searchCharges,
  type ChargeAllocationResponse,
  type ChargeResponse,
  type PaymentMethodKey,
  type PropertyTypeKey,
} from "../../lib/api/payments";
import { Modal } from "../Modal";
import { OwnerPicker } from "../binalar/OwnerPicker";
import { PayButton } from "../binalar/finance";
import { resolveOwnerNames, resolvePropertyLabels } from "../binalar/resolve";

const PAGE_SIZE = 20;
// One bigger pull, status segmented client-side (the ledger pattern): the
// server-side QueryFilter can only express one comparison, and the stats need
// the whole picture anyway.
const FETCH_SIZE = 500;

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

type Scope = "open" | "paid" | "all";

export function BorclarView() {
  const auth = useAuth();
  const [charges, setCharges] = useState<ChargeResponse[] | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [propertyLabels, setPropertyLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Hansı borcun hansı ödənişlərlə (avansdan və ya birbaşa) bağlandığı — tələb
  // üzrə yüklənir, çünki sətir sayı çox ola bilər.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocationsByCharge, setAllocationsByCharge] = useState<Record<string, ChargeAllocationResponse[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    searchCharges(auth.accessToken, {
      sortCriteria: { columnName: "CreatedAt", direction: SortDirection.Descending },
      pageSize: FETCH_SIZE,
    })
      .then((res) => {
        setCharges(res.charges);
        setError(null);
        return Promise.all([
          resolveOwnerNames(auth.accessToken, res.charges.map((c) => c.ownerId)),
          resolvePropertyLabels(
            auth.accessToken,
            res.charges.map((c) => ({
              propertyType: c.propertyType === 0 ? "Apartment" : "Garage",
              propertyId: c.propertyId,
            })),
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
  }, [auth]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (auth.status !== "authenticated") return null;

  // Arrow (not a hoisted function declaration) so TypeScript keeps the
  // "authenticated" narrowing of `auth` inside this closure.
  const toggleAllocations = (chargeId: string) => {
    if (expandedId === chargeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(chargeId);
    if (!allocationsByCharge[chargeId]) {
      setLoadingId(chargeId);
      getChargeAllocations(auth.accessToken, chargeId)
        .then((res) => setAllocationsByCharge((prev) => ({ ...prev, [chargeId]: res })))
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoadingId(null));
    }
  };

  const term = search.trim().toLowerCase();
  const visible = (charges ?? []).filter((c) => {
    const status = chargeStatusFromOrdinal(c.status);
    if (scope === "open" && status === "Paid") return false;
    if (scope === "paid" && status !== "Paid") return false;
    if (term) {
      const owner = ownerNames[c.ownerId] ?? "";
      const property = propertyLabels[c.propertyId] ?? "";
      const haystack = `${owner} ${property} ${c.period} ${c.description ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const openCharges = (charges ?? []).filter((c) => chargeStatusFromOrdinal(c.status) !== "Paid");
  const totalOpen = openCharges.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);
  const totalPaidAll = (charges ?? []).reduce((sum, c) => sum + c.paidAmount, 0);
  const ownerCount = new Set(openCharges.map((c) => c.ownerId)).size;

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="panel-page">
      <div className="panel-page-head">
        <div>
          <h1>Borclar</h1>
          <p className="panel-page-lead">
            Sakinlərin mənzil və qaraj üzrə ödənilməmiş haqqları. Ödəniş daxil olan kimi borc FIFO
            qaydasında bağlanır və jurnal gəlir qeydi yazılır.
          </p>
        </div>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          onClick={() => setShowAddCharge(true)}
        >
          + Yeni haqq
        </button>
      </div>

      <div className="ledger-stats">
        <article className="ledger-stat ledger-stat-out">
          <span className="vendor-stat-label">Açıq borc</span>
          <strong className="ledger-value-out">{formatMoney(totalOpen)}</strong>
          <span className="ledger-stat-caption">{openCharges.length} ödənilməmiş haqq</span>
        </article>
        <article className="ledger-stat ledger-stat-in">
          <span className="vendor-stat-label">Ödənilib</span>
          <strong className="ledger-value-in">{formatMoney(totalPaidAll)}</strong>
          <span className="ledger-stat-caption">bütün dövrlər üzrə</span>
        </article>
        <article className="ledger-stat ledger-stat-net">
          <span className="vendor-stat-label">Borclu sahib</span>
          <strong>{ownerCount}</strong>
          <span className="ledger-stat-caption">unikal şəxs</span>
        </article>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      <div className="data-table-wrap">
        <div className="vendor-head">
          <h3>Haqqlar</h3>
          <span className="vendor-count">{visible.length} qeyd</span>
        </div>

        <div className="ledger-filter-footer" style={{ padding: "12px 18px 0" }}>
          <div className="ledger-segmented" role="group" aria-label="Borc vəziyyəti">
            {(["open", "paid", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                className={scope === value ? "active" : ""}
                onClick={() => {
                  setScope(value);
                  setPage(1);
                }}
              >
                {value === "open" ? "Açıq" : value === "paid" ? "Ödənilib" : "Hamısı"}
              </button>
            ))}
          </div>
          <input
            className="panel-search"
            style={{ maxWidth: 300 }}
            placeholder="Axtar (sahib, əmlak, dövr…)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {!charges ? (
          <div className="ledger-skeletons" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="ledger-skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="ledger-empty">
            <span aria-hidden="true">₼</span>
            <strong>Borc yoxdur</strong>
            <p>
              {scope === "open"
                ? "Bütün haqqlar ödənilib."
                : "Bu axtarışa uyğun haqq tapılmadı."}
            </p>
          </div>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table ledger-table vendor-table">
              <colgroup>
                <col style={{ width: 44 }} />
                <col className="vendor-col-vendor" />
                <col className="vendor-col-desc" />
                <col className="vendor-col-source" />
                <col className="vendor-col-amount" />
                <col className="vendor-col-amount" />
                <col className="vendor-col-status" />
                <col className="vendor-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>Sahib</th>
                  <th>Əmlak</th>
                  <th>Dövr</th>
                  <th className="vendor-th-amount">Qalıq</th>
                  <th className="vendor-th-amount">Məbləğ</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const status = chargeStatusFromOrdinal(c.status);
                  const remaining = c.amount - c.paidAmount;
                  const propertyType: PropertyTypeKey = c.propertyType === 0 ? "Apartment" : "Garage";
                  const rows = allocationsByCharge[c.id];
                  const isOpen = expandedId === c.id;
                  // Avans izi: bu borca tətbiq olunmuş ödəniş borc yaranmazdan əvvəl
                  // alınıbsa, pul həmin an avans idi.
                  const fromAdvance = (rows ?? []).some(
                    (a) => new Date(a.paymentDate) < new Date(c.issuedOn),
                  );
                  return (
                    <Fragment key={c.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            aria-expanded={isOpen}
                            title="Hansı ödənişlərlə bağlanıb"
                            onClick={() => toggleAllocations(c.id)}
                          >
                            {isOpen ? "▲" : "▼"}
                          </button>
                        </td>
                        <td className="vendor-cell-vendor">
                          <Link className="owner-link" href={`/panel/binalar/sahibler/${c.ownerId}`}>
                            {ownerNames[c.ownerId] ?? "…"}
                          </Link>
                          {c.description && <span className="vendor-cell-sub">{c.description}</span>}
                          {fromAdvance && <span className="vendor-cell-sub">avansdan ödənilib</span>}
                        </td>
                        <td>{propertyLabels[c.propertyId] ?? "…"}</td>
                        <td>
                          {c.period || "—"}
                          <span className="vendor-cell-sub">borc tarixi {c.issuedOn.slice(0, 10)}</span>
                        </td>
                        <td className="vendor-amount">
                          <strong className={remaining > 0 ? "vendor-value-danger" : "vendor-value-ok"}>
                            {formatMoney(remaining)}
                          </strong>
                          <span className="vendor-cell-sub">ödənilib {formatMoney(c.paidAmount)}</span>
                        </td>
                        <td className="vendor-amount">{formatMoney(c.amount)}</td>
                        <td>
                          <span
                            className={`vendor-status ${
                              status === "Paid"
                                ? "vendor-status-paid"
                                : status === "PartiallyPaid"
                                  ? "vendor-status-partial"
                                  : "vendor-status-open"
                            }`}
                          >
                            {CHARGE_STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td>
                          <div className="data-table-actions">
                            {remaining > 0 && (
                              <PayButton
                                ownerId={c.ownerId}
                                propertyId={c.propertyId}
                                propertyType={propertyType}
                                balance={-remaining}
                                onPaid={load}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td></td>
                          <td colSpan={7}>
                            {loadingId === c.id ? (
                              <p className="panel-page-lead">Yüklənir…</p>
                            ) : (rows?.length ?? 0) === 0 ? (
                              <p className="panel-page-lead">Bu haqqa hələ heç bir ödəniş tətbiq olunmayıb.</p>
                            ) : (
                              <table className="data-table" style={{ margin: 0 }}>
                                <thead>
                                  <tr>
                                    <th>Ödəniş tarixi</th>
                                    <th>Məbləğ</th>
                                    <th>Üsul</th>
                                    <th>Mənbə</th>
                                    <th>İstinad</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(rows ?? []).map((a) => {
                                    const isAdvance = new Date(a.paymentDate) < new Date(c.issuedOn);
                                    return (
                                      <tr key={`${a.paymentId}-${a.allocatedAmount}`}>
                                        <td>{a.paymentDate.slice(0, 10)}</td>
                                        <td>{formatMoney(a.allocatedAmount)}</td>
                                        <td>
                                          {PAYMENT_METHOD_LABELS[a.paymentMethod as PaymentMethodKey] ??
                                            a.paymentMethod}
                                        </td>
                                        <td>
                                          <span
                                            className={`vendor-status ${
                                              isAdvance ? "vendor-status-partial" : "vendor-status-paid"
                                            }`}
                                          >
                                            {isAdvance ? "Avansdan" : "Birbaşa ödənişdən"}
                                          </span>
                                        </td>
                                        <td>{a.reference || "—"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {visible.length > PAGE_SIZE && (
          <div className="panel-pagination">
            <span>
              {visible.length} haqq — səhifə {page}/{pageCount}
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
        )}
      </div>

      {showAddCharge && (
        <AddChargeModal
          accessToken={auth.accessToken}
          onClose={() => setShowAddCharge(false)}
          onSaved={() => {
            setShowAddCharge(false);
            setReloadKey((k) => k + 1);
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
