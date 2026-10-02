"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything, useCanPay } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import {
  VENDOR_TYPE_LABELS,
  VENDOR_TYPES_ORDERED,
  createVendor,
  deleteVendor,
  getVendor,
  searchVendors,
  setVendorStatus,
  updateVendor,
  vendorTypeFromOrdinal,
  type VendorListResult,
  type VendorResponse,
  type VendorTypeKey,
} from "../../lib/api/vendors";
import {
  VENDOR_CHARGE_STATUS_LABELS,
  cancelVendorCharge,
  createVendorPayment,
  searchVendorCharges,
  vendorChargeStatusFromOrdinal,
  type VendorChargeResponse,
} from "../../lib/api/vendorCharges";
import { resolveVendorNames } from "../binalar/resolve";
import { Modal } from "../Modal";

const VENDOR_PAGE_SIZE = 10;
// Same pattern as the ledger: one big pull, filtered client-side. The generic
// QueryFilter path can't be trusted for statuses across modules, and stats need
// the full picture anyway.
const CHARGE_FETCH_SIZE = 500;

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const dateOnly = (iso: string) => iso.slice(0, 10);

type Segment = "vendors" | "debts";

export function TedarukculerView() {
  const auth = useAuth();
  const [segment, setSegment] = useState<Segment>("vendors");

  if (auth.status !== "authenticated") return null;

  return (
    <div>
      <div className="vendor-segments" role="group" aria-label="Bölmə">
        <button
          type="button"
          className={segment === "vendors" ? "active" : ""}
          aria-pressed={segment === "vendors"}
          onClick={() => setSegment("vendors")}
        >
          Tədarükçülər
        </button>
        <button
          type="button"
          className={segment === "debts" ? "active" : ""}
          aria-pressed={segment === "debts"}
          onClick={() => setSegment("debts")}
        >
          Borclar
        </button>
      </div>

      {segment === "vendors" ? <VendorsSegment /> : <DebtsSegment />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tədarükçülər                                                        */
/* ------------------------------------------------------------------ */

function VendorsSegment() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [vendors, setVendors] = useState<VendorListResult[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorResponse | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new search term restarts pagination from the first page.
  const filterSignature = JSON.stringify(searchTerm);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    searchVendors(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      page: pageNumber - 1,
      pageSize: VENDOR_PAGE_SIZE,
    })
      .then((res) => {
        setVendors(res.vendors);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;

  const accessToken = auth.accessToken;
  const pageCount = Math.max(1, Math.ceil(totalCount / VENDOR_PAGE_SIZE));

  async function handleToggleStatus(vendor: VendorListResult) {
    setWorkingId(vendor.id);
    setError(null);
    try {
      await setVendorStatus(accessToken, vendor.id, !vendor.isActive);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleEdit(vendor: VendorListResult) {
    setWorkingId(vendor.id);
    setError(null);
    try {
      // The list DTO is intentionally light (no note), so the form loads the
      // full record before opening.
      setEditing(await getVendor(accessToken, vendor.id));
      setFormOpen(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleDelete(vendor: VendorListResult) {
    if (!window.confirm(`${vendor.name} silinsin? Bu əməliyyat geri qaytarıla bilməz.`)) return;

    setWorkingId(vendor.id);
    setError(null);
    try {
      await deleteVendor(accessToken, vendor.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  if (error && !vendors) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (ad, VÖEN, rəhbər, e-poçt…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {canManage && (
          <button
            type="button"
            className="panel-btn panel-btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Yeni tədarükçü
          </button>
        )}
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!vendors ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <div className="vendor-head">
            <h3>Tədarükçü reyestri</h3>
            <span className="vendor-count">{totalCount} qeyd</span>
          </div>
          <div className="owner-table-scroll">
            <table className="data-table vendor-table">
              <colgroup>
                <col className="vendor-col-vendor" />
                <col className="vendor-col-desc" />
                <col className="vendor-col-source" />
                <col className="vendor-col-status" />
                <col className="vendor-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Tədarükçü</th>
                  <th>Əlaqə</th>
                  <th>VÖEN</th>
                  <th>Status</th>
                  <th className="ledger-th-amount"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="vendor-cell-vendor">
                      <Link className="owner-link" href={`/panel/tedarukculer/${v.id}`}>
                        {v.name}
                      </Link>
                      <span className="vendor-cell-sub">
                        {VENDOR_TYPE_LABELS[vendorTypeFromOrdinal(v.vendorType)]}
                        {v.director ? ` · ${v.director}` : ""}
                      </span>
                    </td>
                    <td>
                      {v.phone ?? "—"}
                      {v.email && <span className="vendor-cell-sub">{v.email}</span>}
                    </td>
                    <td>{v.voen ?? "—"}</td>
                    <td>
                      <span className={`vendor-status ${v.isActive ? "vendor-status-active" : "vendor-status-suspended"}`}>
                        {v.isActive ? "Aktiv" : "Dayandırılıb"}
                      </span>
                    </td>
                    <td>
                      {canManage && (
                        <div className="data-table-actions">
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={workingId === v.id}
                            onClick={() => handleEdit(v)}
                          >
                            Redaktə
                          </button>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={workingId === v.id}
                            onClick={() => handleToggleStatus(v)}
                          >
                            {v.isActive ? "Dayandır" : "Aktivləşdir"}
                          </button>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            disabled={workingId === v.id}
                            onClick={() => handleDelete(v)}
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-pagination">
            <span>
              Səhifə {pageNumber}/{pageCount}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                Əvvəlki
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={pageNumber >= pageCount}
                onClick={() => setPageNumber((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <VendorFormModal
          vendor={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Borclar                                                             */
/* ------------------------------------------------------------------ */

function DebtsSegment() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const canMakePayments = useCanPay();
  const [charges, setCharges] = useState<VendorChargeResponse[] | null>(null);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"open" | "all">("open");
  const [search, setSearch] = useState("");
  const [payCharge, setPayCharge] = useState<VendorChargeResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchVendorCharges(auth.accessToken, {
      sortCriteria: { columnName: "CreatedAt", direction: 1 },
      pageSize: CHARGE_FETCH_SIZE,
    })
      .then((res) => {
        setCharges(res.items);
        setError(null);
        return resolveVendorNames(auth.accessToken, res.items.map((c) => c.vendorId));
      })
      .then((names) => {
        if (names) setVendorNames((prev) => ({ ...prev, ...names }));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  const term = search.trim().toLowerCase();
  const visible = (charges ?? []).filter((c) => {
    const status = vendorChargeStatusFromOrdinal(c.status);
    if (scope === "open" && (status === "Paid" || status === "Cancelled")) return false;
    if (term) {
      const vendor = vendorNames[c.vendorId] ?? "";
      const haystack = `${c.description} ${c.period ?? ""} ${vendor}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const openCharges = (charges ?? []).filter((c) => {
    const status = vendorChargeStatusFromOrdinal(c.status);
    return status !== "Paid" && status !== "Cancelled";
  });
  const totalOpen = openCharges.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const overdue = openCharges.filter((c) => c.isOverdue);
  const totalOverdue = overdue.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const totalPaid = (charges ?? []).reduce((sum, c) => sum + c.paidAmount, 0);

  async function handleCancel(charge: VendorChargeResponse) {
    if (!window.confirm(`"${charge.description}" borcu ləğv edilsin?`)) return;
    setWorkingId(charge.id);
    setError(null);
    try {
      await cancelVendorCharge(accessToken, charge.id);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div>
      <div className="ledger-stats">
        <article className="ledger-stat ledger-stat-out">
          <span className="vendor-stat-label">Açıq borc</span>
          <strong className="ledger-value-out">{formatMoney(totalOpen)}</strong>
          <span className="ledger-stat-caption">{openCharges.length} ödənilməmiş borc</span>
        </article>
        <article className="ledger-stat vendor-stat-danger">
          <span className="vendor-stat-label">Gecikmiş</span>
          <strong className={totalOverdue > 0 ? "ledger-value-out" : ""}>{formatMoney(totalOverdue)}</strong>
          <span className="ledger-stat-caption">{overdue.length} borc son tarixi keçib</span>
        </article>
        <article className="ledger-stat ledger-stat-in">
          <span className="vendor-stat-label">Ödənilib</span>
          <strong className="ledger-value-in">{formatMoney(totalPaid)}</strong>
          <span className="ledger-stat-caption">bütün dövrlər üzrə</span>
        </article>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      <div className="data-table-wrap">
        <div className="vendor-head">
          <h3>Borclar</h3>
          <span className="vendor-count">{visible.length} qeyd</span>
        </div>

        <div className="ledger-filter-footer" style={{ padding: "12px 18px 0" }}>
          <div className="ledger-segmented" role="group" aria-label="Borc əhatəsi">
            {(["open", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                className={scope === value ? "active" : ""}
                onClick={() => setScope(value)}
              >
                {value === "open" ? "Açıq borclar" : "Hamısı"}
              </button>
            ))}
          </div>
          <input
            className="panel-search"
            style={{ maxWidth: 280 }}
            placeholder="Axtar (təsvir, tədarükçü…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!charges ? (
          <div className="ledger-skeletons" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ledger-skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="ledger-empty">
            <span aria-hidden="true">⌗</span>
            <strong>Borc yoxdur</strong>
            <p>
              {scope === "open"
                ? "Bütün borclar ödənilib və ya ləğv edilib."
                : "Bu axtarışa uyğun borc tapılmadı."}
            </p>
          </div>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table ledger-table vendor-table">
              <colgroup>
                <col className="vendor-col-vendor" />
                <col className="vendor-col-desc" />
                <col className="vendor-col-amount" />
                <col className="vendor-col-amount" />
                <col className="vendor-col-status" />
                <col className="vendor-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Tədarükçü</th>
                  <th>Təsvir</th>
                  <th className="vendor-th-amount">Qalıq</th>
                  <th className="vendor-th-amount">Məbləğ</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const status = vendorChargeStatusFromOrdinal(c.status);
                  const canPay = status === "Unpaid" || status === "PartiallyPaid";
                  return (
                    <tr key={c.id}>
                      <td className="vendor-cell-vendor">
                        <Link className="owner-link" href={`/panel/tedarukculer/${c.vendorId}`}>
                          {vendorNames[c.vendorId] ?? "…"}
                        </Link>
                        {c.period && <span className="vendor-cell-sub">Dövr: {c.period}</span>}
                      </td>
                      <td className="ledger-cell-note">
                        {c.description}
                        {c.isOverdue && (
                          <span className="vendor-cell-sub vendor-value-danger">
                            Son tarix {dateOnly(c.dueDate!)} — gecikib
                          </span>
                        )}
                      </td>
                      <td className="vendor-amount">
                        <strong className={c.outstandingAmount > 0 ? "vendor-value-danger" : "vendor-value-ok"}>
                          {formatMoney(c.outstandingAmount)}
                        </strong>
                        <span className="vendor-cell-sub">
                          ödənilib {formatMoney(c.paidAmount)} / {formatMoney(c.amount)}
                        </span>
                      </td>
                      <td className="vendor-amount">{formatMoney(c.amount)}</td>
                      <td>
                        <span className={`vendor-status vendor-status-${status.toLowerCase()}`}>
                          {VENDOR_CHARGE_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td>
                        <div className="data-table-actions">
                          {canMakePayments && canPay && (
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm panel-btn-primary"
                              disabled={workingId === c.id}
                              onClick={() => setPayCharge(c)}
                            >
                              Ödə
                            </button>
                          )}
                          {canManage && status !== "Paid" && status !== "Cancelled" && (
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm panel-btn-danger"
                              disabled={workingId === c.id}
                              onClick={() => handleCancel(c)}
                            >
                              Ləğv et
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="vendor-note">
        Cədvəl üzrə xidmət borcları (texniki baxış, sığorta və s.) hər ayın 1-də avtomatik yaranır.
        Ödəniş tranzaksiyalar jurnalına xərc kimi düşür.
      </p>

      {payCharge && (
        <PayVendorChargeModal
          charge={payCharge}
          onClose={() => setPayCharge(null)}
          onSaved={() => {
            setPayCharge(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modallar                                                            */
/* ------------------------------------------------------------------ */

function PayVendorChargeModal({
  charge,
  onClose,
  onSaved,
}: {
  charge: VendorChargeResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [amount, setAmount] = useState(String(charge.outstandingAmount));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError("Ödəniş məbləği müsbət olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createVendorPayment(accessToken, {
        vendorId: charge.vendorId,
        amount: value,
        paymentMethod: "Cash",
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Tədarükçüyə ödəniş" onClose={onClose}>
      <p className="panel-page-lead">
        {charge.description} · qalıq borc{" "}
        <strong>{charge.outstandingAmount.toFixed(2)} ₼</strong>
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="vpay-amount">Məbləğ (₼)</label>
          <input
            id="vpay-amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Ödənilir…" : "Ödə"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VendorFormModal({
  vendor,
  onClose,
  onSaved,
}: {
  /** null → yeni tədarükçü, əks halda redaktə. */
  vendor: VendorResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [name, setName] = useState(vendor?.name ?? "");
  const [vendorType, setVendorType] = useState<VendorTypeKey>(
    vendor ? vendorTypeFromOrdinal(vendor.vendorType) : "LegalEntity",
  );
  const [voen, setVoen] = useState(vendor?.voen ?? "");
  const [director, setDirector] = useState(vendor?.director ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [address, setAddress] = useState(vendor?.address ?? "");
  const [note, setNote] = useState(vendor?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const request = {
        name,
        vendorType,
        voen: voen || null,
        director: director || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        note: note || null,
      };

      if (vendor) {
        await updateVendor(accessToken, vendor.id, request);
      } else {
        await createVendor(accessToken, request);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={vendor ? "Tədarükçünü redaktə et" : "Yeni tədarükçü"} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="vendor-name">Ad</label>
            <input id="vendor-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="vendor-type">Tip</label>
            <select
              id="vendor-type"
              value={vendorType}
              onChange={(e) => setVendorType(e.target.value as VendorTypeKey)}
            >
              {VENDOR_TYPES_ORDERED.map((key) => (
                <option key={key} value={key}>
                  {VENDOR_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="vendor-voen">VÖEN</label>
            <input id="vendor-voen" value={voen} onChange={(e) => setVoen(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="vendor-director">Rəhbər / təmsilçi</label>
            <input id="vendor-director" value={director} onChange={(e) => setDirector(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="vendor-phone">Telefon</label>
            <input id="vendor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="vendor-email">E-poçt</label>
            <input
              id="vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="vendor-address">Ünvan</label>
          <input id="vendor-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="vendor-note">Qeyd</label>
          <textarea id="vendor-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : vendor ? "Saxla" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
