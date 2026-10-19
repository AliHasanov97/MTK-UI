"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything, useCanPay } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPES_ORDERED,
  createCustomer,
  customerTypeFromOrdinal,
  deleteCustomer,
  getCustomer,
  searchCustomers,
  setCustomerStatus,
  updateCustomer,
  type CustomerListResult,
  type CustomerResponse,
  type CustomerTypeKey,
} from "../../lib/api/customers";
import {
  cancelCustomerCharge,
  createCustomerCharge,
  createCustomerPayment,
  searchCustomerCharges,
  type CustomerChargeResponse,
} from "../../lib/api/customerCharges";
import {
  PAYMENT_METHOD_LABELS,
  VENDOR_CHARGE_STATUS_LABELS,
  vendorChargeStatusFromOrdinal,
  type PaymentMethodKey,
} from "../../lib/api/vendorCharges";
import { dateOnlyToUtcIso } from "../../lib/api/payments";
import { Modal } from "../Modal";
import { SearchableSelect } from "../SearchableSelect";
import { DateInput } from "../../components/DateInput";
import { useConfirm } from "../../components/ConfirmDialog";

const PAGE_SIZE = 10;
const CHARGE_FETCH_SIZE = 500;

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;
const dateOnly = (iso: string) => iso.slice(0, 10);

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function CustomersSegment() {
  const auth = useAuth();
  const confirm = useConfirm();
  const canManage = useCanDoEverything();
  const [customers, setCustomers] = useState<CustomerListResult[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerResponse | null>(null);
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

    searchCustomers(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setCustomers(res.customers);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;

  const accessToken = auth.accessToken;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function handleToggleStatus(customer: CustomerListResult) {
    setWorkingId(customer.id);
    setError(null);
    try {
      await setCustomerStatus(accessToken, customer.id, !customer.isActive);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleEdit(customer: CustomerListResult) {
    setWorkingId(customer.id);
    setError(null);
    try {
      // The list DTO is intentionally light (no note), so the form loads the
      // full record before opening.
      setEditing(await getCustomer(accessToken, customer.id));
      setFormOpen(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleDelete(customer: CustomerListResult) {
    if (!(await confirm(`${customer.name} silinsin? Bu əməliyyat geri qaytarıla bilməz.`))) return;

    setWorkingId(customer.id);
    setError(null);
    try {
      await deleteCustomer(accessToken, customer.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  if (error && !customers) {
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
            + Yeni müştəri
          </button>
        )}
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!customers ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <div className="vendor-head">
            <h3>Müştəri reyestri</h3>
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
                  <th>Müştəri</th>
                  <th>Əlaqə</th>
                  <th>VÖEN</th>
                  <th>Status</th>
                  <th className="ledger-th-amount"></th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="vendor-cell-vendor">
                      <Link className="owner-link" href={`/panel/musteriler/${c.id}`}>
                        {c.name}
                      </Link>
                      <span className="vendor-cell-sub">
                        {CUSTOMER_TYPE_LABELS[customerTypeFromOrdinal(c.customerType)]}
                        {c.director ? ` · ${c.director}` : ""}
                      </span>
                    </td>
                    <td>
                      {c.phone ?? "—"}
                      {c.email && <span className="vendor-cell-sub">{c.email}</span>}
                    </td>
                    <td>{c.voen ?? "—"}</td>
                    <td>
                      <span className={`vendor-status ${c.isActive ? "vendor-status-active" : "vendor-status-suspended"}`}>
                        {c.isActive ? "Aktiv" : "Dayandırılıb"}
                      </span>
                    </td>
                    <td>
                      {canManage && (
                        <div className="data-table-actions">
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={workingId === c.id}
                            onClick={() => handleEdit(c)}
                          >
                            Redaktə
                          </button>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={workingId === c.id}
                            onClick={() => handleToggleStatus(c)}
                          >
                            {c.isActive ? "Dayandır" : "Aktivləşdir"}
                          </button>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            disabled={workingId === c.id}
                            onClick={() => handleDelete(c)}
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
        <CustomerFormModal
          customer={editing}
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

function CustomerFormModal({
  customer,
  onClose,
  onSaved,
}: {
  /** null → yeni müştəri, əks halda redaktə. */
  customer: CustomerResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [name, setName] = useState(customer?.name ?? "");
  const [customerType, setCustomerType] = useState<CustomerTypeKey>(
    customer ? customerTypeFromOrdinal(customer.customerType) : "LegalEntity",
  );
  const [voen, setVoen] = useState(customer?.voen ?? "");
  const [director, setDirector] = useState(customer?.director ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
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
        customerType,
        voen: voen || null,
        director: director || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        note: note || null,
      };

      if (customer) {
        await updateCustomer(accessToken, customer.id, request);
      } else {
        await createCustomer(accessToken, request);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={customer ? "Müştərini redaktə et" : "Yeni müştəri"} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="customer-name">Ad</label>
            <input id="customer-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="customer-type">Tip</label>
            <select
              id="customer-type"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as CustomerTypeKey)}
            >
              {CUSTOMER_TYPES_ORDERED.map((key) => (
                <option key={key} value={key}>
                  {CUSTOMER_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="customer-voen">VÖEN</label>
            <input id="customer-voen" value={voen} onChange={(e) => setVoen(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="customer-director">Rəhbər / təmsilçi</label>
            <input id="customer-director" value={director} onChange={(e) => setDirector(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="customer-phone">Telefon</label>
            <input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="customer-email">E-poçt</label>
            <input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="customer-address">Ünvan</label>
          <input id="customer-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="customer-note">Qeyd</label>
          <textarea id="customer-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : customer ? "Saxla" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Səhifə: Müştərilər / Borclar                                        */
/* ------------------------------------------------------------------ */

type Segment = "customers" | "debts";

export function MusterilerView() {
  const auth = useAuth();
  const [segment, setSegment] = useState<Segment>("customers");

  if (auth.status !== "authenticated") return null;

  return (
    <div>
      <div className="vendor-segments" role="group" aria-label="Bölmə">
        <button
          type="button"
          className={segment === "customers" ? "active" : ""}
          aria-pressed={segment === "customers"}
          onClick={() => setSegment("customers")}
        >
          Müştərilər
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

      {segment === "customers" ? <CustomersSegment /> : <DebtsSegment />}
    </div>
  );
}

function DebtsSegment() {
  const auth = useAuth();
  const confirm = useConfirm();
  const canManage = useCanDoEverything();
  const canMakePayments = useCanPay();
  const [charges, setCharges] = useState<CustomerChargeResponse[] | null>(null);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"open" | "all">("open");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [payCustomer, setPayCustomer] = useState<{ id: string; name: string; outstanding: number } | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const token = auth.accessToken;
    Promise.all([
      searchCustomerCharges(token, {
        sortCriteria: { columnName: "CreatedAt", direction: 1 },
        pageSize: CHARGE_FETCH_SIZE,
      }),
      searchCustomers(token, { pageSize: CHARGE_FETCH_SIZE }),
    ])
      .then(([chargeRes, customerRes]) => {
        setCharges(chargeRes.items);
        setCustomerNames(Object.fromEntries(customerRes.customers.map((c) => [c.id, c.name])));
        setError(null);
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
      const haystack = `${c.description ?? ""} ${c.period ?? ""} ${customerNames[c.customerId] ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const groupMap = new Map<string, { customerId: string; name: string; charges: CustomerChargeResponse[] }>();
  for (const c of visible) {
    const group = groupMap.get(c.customerId);
    if (group) group.charges.push(c);
    else groupMap.set(c.customerId, { customerId: c.customerId, name: customerNames[c.customerId] ?? "Müştəri", charges: [c] });
  }
  const groups = Array.from(groupMap.values());

  const openCharges = (charges ?? []).filter((c) => {
    const status = vendorChargeStatusFromOrdinal(c.status);
    return status !== "Paid" && status !== "Cancelled";
  });
  const totalOpen = openCharges.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const overdue = openCharges.filter((c) => c.isOverdue);
  const totalOverdue = overdue.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const totalPaid = (charges ?? []).reduce((sum, c) => sum + c.paidAmount, 0);

  async function handleCancel(charge: CustomerChargeResponse) {
    if (!(await confirm(`"${charge.description}" borcu ləğv edilsin?`))) return;
    setWorkingId(charge.id);
    setError(null);
    try {
      await cancelCustomerCharge(accessToken, charge.id);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="debt-page vendor-debt-page">
      <section className="debt-summary-grid" aria-label="Müştəri borclarının xülasəsi">
        <article className="debt-summary-card debt-summary-open">
          <span className="debt-summary-label">Gözlənilən daxilolma</span>
          <strong>{formatMoney(totalOpen)}</strong>
          <span>{openCharges.length} ödənilməmiş haqq</span>
        </article>
        <article className="debt-summary-card debt-summary-overdue">
          <span className="debt-summary-label">Gecikmiş</span>
          <strong>{formatMoney(totalOverdue)}</strong>
          <span>{overdue.length} borcun son tarixi keçib</span>
        </article>
        <article className="debt-summary-card debt-summary-paid">
          <span className="debt-summary-label">Daxil olub</span>
          <strong>{formatMoney(totalPaid)}</strong>
          <span>Bütün dövrlər üzrə</span>
        </article>
      </section>

      {error && <p className="ledger-alert" role="alert">{error}</p>}

      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Müştəri, xidmət və ya dövr üzrə axtar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        {canMakePayments && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setChargeOpen(true)}>
            + Borc yaz
          </button>
        )}
      </div>

      {!charges ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : groups.length === 0 ? (
        <div className="debt-empty">
          <span aria-hidden="true">₼</span>
          <strong>{scope === "open" ? "Açıq borc yoxdur" : "Uyğun borc tapılmadı"}</strong>
          <p>
            Müştəri borcları müqavilə üzrə hər ayın 1-də avtomatik yaranır, istəsəniz «Borc yaz» ilə əl ilə də əlavə edə bilərsiniz.
          </p>
        </div>
      ) : (
        <div className="debt-charge-list">
          {groups.map((group) => {
            const groupRemaining = group.charges.reduce(
              (sum, c) => (vendorChargeStatusFromOrdinal(c.status) === "Cancelled" ? sum : sum + c.outstandingAmount),
              0,
            );
            return (
              <article className="debt-charge-card debt-group-card" key={group.customerId} aria-label={`${group.name} borcları`}>
                <div className="debt-charge-top debt-group-head">
                  <div className="debt-resident">
                    <Link className="owner-link" href={`/panel/musteriler/${group.customerId}`}>
                      {group.name}
                    </Link>
                    <span>{group.charges.length} haqq</span>
                  </div>
                  <div className="debt-remaining debt-group-total">
                    <span>Ümumi qalıq</span>
                    <strong className={groupRemaining > 0 ? "vendor-value-danger" : "vendor-value-ok"}>
                      {formatMoney(groupRemaining)}
                    </strong>
                    {canMakePayments && (
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm panel-btn-primary"
                        onClick={() => setPayCustomer({ id: group.customerId, name: group.name, outstanding: groupRemaining })}
                      >
                        Ödəniş qəbul et
                      </button>
                    )}
                  </div>
                </div>

                <div className="owner-table-scroll">
                  <table className="data-table debt-group-table">
                    <thead>
                      <tr>
                        <th>Xidmət</th>
                        <th>Dövr</th>
                        <th>Son tarix</th>
                        <th className="vendor-th-amount">Məbləğ</th>
                        <th className="vendor-th-amount">Ödənilib</th>
                        <th className="vendor-th-amount">Qalıq</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {group.charges.map((charge) => {
                        const status = vendorChargeStatusFromOrdinal(charge.status);
                        const open = status === "Unpaid" || status === "PartiallyPaid";
                        return (
                          <tr key={charge.id}>
                            <td data-label="Xidmət">{charge.description ?? "Xidmət borcu"}</td>
                            <td data-label="Dövr">{charge.period ?? "—"}</td>
                            <td data-label="Son tarix">
                              {charge.dueDate ? dateOnly(charge.dueDate) : "—"}
                              {charge.isOverdue && charge.dueDate && (
                                <div className="debt-advance-note debt-overdue-note">gecikib</div>
                              )}
                            </td>
                            <td className="vendor-amount" data-label="Məbləğ">{formatMoney(charge.amount)}</td>
                            <td className="vendor-amount" data-label="Ödənilib">{formatMoney(charge.paidAmount)}</td>
                            <td
                              data-label="Qalıq"
                              className={`vendor-amount ${charge.outstandingAmount > 0 ? "vendor-value-danger" : "vendor-value-ok"}`}
                            >
                              {formatMoney(charge.outstandingAmount)}
                            </td>
                            <td data-label="Status">
                              <span className={`vendor-status vendor-status-${status.toLowerCase()}`}>
                                {charge.isOverdue && open ? "Gecikib" : VENDOR_CHARGE_STATUS_LABELS[status]}
                              </span>
                            </td>
                            <td>
                              {canManage && open && (
                                <button
                                  type="button"
                                  className="panel-btn panel-btn-sm panel-btn-danger"
                                  disabled={workingId === charge.id}
                                  onClick={() => handleCancel(charge)}
                                >
                                  Ləğv et
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="vendor-note">
        Müştəri ödənişləri tranzaksiyalar jurnalında gəlir kimi göstərilir. Borcdan artıq ödəniş avans kimi qalır və növbəti borca avtomatik tətbiq olunur.
      </p>

      {chargeOpen && (
        <CreateChargeModal
          onClose={() => setChargeOpen(false)}
          onSaved={() => {
            setChargeOpen(false);
            reload();
          }}
        />
      )}

      {payCustomer && (
        <ReceivePaymentModal
          customer={payCustomer}
          onClose={() => setPayCustomer(null)}
          onSaved={() => {
            setPayCustomer(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

export function CreateChargeModal({
  customerId: fixedCustomerId,
  onClose,
  onSaved,
}: {
  /** Verilərsə müştəri seçimi göstərilmir (müştərinin öz səhifəsindən açılanda). */
  customerId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [customers, setCustomers] = useState<CustomerListResult[] | null>(null);
  const [pickedCustomerId, setPickedCustomerId] = useState("");
  const customerId = fixedCustomerId ?? pickedCustomerId;
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated" || fixedCustomerId) return;
    searchCustomers(auth.accessToken, { pageSize: 200 })
      .then((res) => setCustomers(res.customers.filter((c) => c.isActive)))
      .catch((err) => setError(errorMessage(err)));
  }, [auth, fixedCustomerId]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Müştəri seçin.");
      return;
    }
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError("Məbləğ müsbət olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCustomerCharge(accessToken, {
        customerId,
        description,
        amount: value,
        dueDate: dueDate ? dateOnlyToUtcIso(dueDate) : null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Müştəriyə borc yaz" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        {!fixedCustomerId && (
          <div className="form-field">
            <label>Müştəri</label>
            {customers === null ? (
              <p className="panel-page-lead">Müştərilər yüklənir…</p>
            ) : customers.length === 0 ? (
              <p className="panel-page-lead">Aktiv müştəri yoxdur.</p>
            ) : (
              <SearchableSelect
                options={customers.map((c) => ({ value: c.id, label: c.name, sublabel: c.voen ?? undefined }))}
                value={pickedCustomerId}
                onChange={setPickedCustomerId}
                placeholder="Müştəri seçin…"
              />
            )}
          </div>
        )}
        <div className="form-field">
          <label htmlFor="cc-description">Təsvir</label>
          <input
            id="cc-description"
            required
            placeholder="məs. Əlavə xidmət haqqı"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="cc-amount">Məbləğ (₼)</label>
            <input
              id="cc-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="cc-due">Son ödəniş tarixi</label>
            <DateInput id="cc-due" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || (!fixedCustomerId && !customers?.length)}>
            {saving ? "Saxlanılır…" : "Yaz"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ReceivePaymentModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: { id: string; name: string; outstanding: number };
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [amount, setAmount] = useState(customer.outstanding > 0 ? String(customer.outstanding) : "");
  const [method, setMethod] = useState<PaymentMethodKey>("Cash");
  const [notes, setNotes] = useState("");
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
      await createCustomerPayment(accessToken, {
        customerId: customer.id,
        amount: value,
        paymentMethod: method,
        notes: notes || null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Müştəridən ödəniş" onClose={onClose}>
      <p className="panel-page-lead">
        {customer.name} · qalıq borc <strong>{formatMoney(customer.outstanding)}</strong>
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="rp-amount">Məbləğ (₼)</label>
            <input
              id="rp-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="rp-method">Ödəniş üsulu</label>
            <select id="rp-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodKey)}>
              {(["Cash", "BankTransfer"] as const).map((key) => (
                <option key={key} value={key}>
                  {PAYMENT_METHOD_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="rp-notes">Qeyd</label>
          <input id="rp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <p className="panel-page-lead" style={{ margin: "0 0 14px" }}>
          Ödəniş ən köhnə borcdan başlayaraq bağlanır, artıq hissə avans kimi qalır.
        </p>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Qəbul et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
