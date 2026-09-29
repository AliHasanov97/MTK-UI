"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  type ChargeAllocationResponse,
  type ChargeResponse,
  type PaymentAllocationDetailResponse,
  type PaymentMethodKey,
  type PaymentResponse,
  type PropertyTypeKey,
  CHARGE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  chargeStatusFromOrdinal,
  createPayment,
  getChargeAllocations,
  getChargesByOwner,
  getPaymentAllocations,
  getPaymentsByProperty,
  getPropertyBalance,
  paymentMethodFromOrdinal,
  paymentStatusFromOrdinal,
  rateTypeFromOrdinal,
} from "../../lib/api/payments";

const AZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

/** "2026-09" -> "Sentyabr 2026". Falls through unchanged for anything else (e.g. a manual charge's own period tag). */
function formatPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const monthName = AZ_MONTHS[Number(m[2]) - 1];
  return monthName ? `${monthName} ${m[1]}` : period;
}

/**
 * Spells out exactly how a charge's Amount was calculated, from the RateAmount/
 * RateType/AreaSquareMeters snapshot taken when it was created — so "46.87 ₼"
 * never has to be taken on faith.
 */
function chargeDescription(c: ChargeResponse): string {
  const rateType = rateTypeFromOrdinal(c.rateType);
  const periodLabel = formatPeriod(c.period);

  if (rateType === "PerSquareMeter" && c.areaSquareMeters != null) {
    return `Aylıq mənzil haqqı (${periodLabel}): ${c.areaSquareMeters.toFixed(2)} m² × ${c.rateAmount.toFixed(2)} ₼/m²`;
  }
  if (rateType === "FixedGarage") {
    return `Aylıq qaraj haqqı (${periodLabel}): sabit ${c.rateAmount.toFixed(2)} ₼`;
  }
  // Manual (one-off) charges already carry a human-written reason.
  return c.description ?? `Haqq (${periodLabel})`;
}

/** Sum of (paid - amount) across charges: negative = debt, positive = advance/credit.
 *  Only correct when every payment involved has fully settled into a charge — see
 *  getPropertyBalance/getOwnerBalance for the authoritative figure, which also
 *  accounts for a targeted payment's unapplied advance portion. */
export function balanceFromCharges(charges: ChargeResponse[]): number {
  return charges.reduce((sum, c) => sum + (c.paidAmount - c.amount), 0);
}

export function lastPaymentDate(payments: PaymentResponse[]): string | null {
  const active = payments.filter((p) => paymentStatusFromOrdinal(p.status) !== "Cancelled");
  if (active.length === 0) return null;
  return active.reduce((latest, p) => (p.paymentDate > latest ? p.paymentDate : latest), active[0].paymentDate);
}

export function formatSigned(amount: number) {
  if (Math.abs(amount) < 0.005) return "0 ₼";
  return `${amount > 0 ? "+" : "-"}${Math.abs(amount).toFixed(2)} ₼`;
}

export function BalanceTag({ balance }: { balance: number }) {
  if (balance < -0.005) return <span className="owner-balance-tag owner-balance-tag-debt">{Math.abs(balance).toFixed(2)} ₼ borc</span>;
  if (balance > 0.005) return <span className="owner-balance-tag owner-balance-tag-credit">{balance.toFixed(2)} ₼ avans</span>;
  return <span className="owner-balance-tag owner-balance-tag-clear">Hesablaşıb</span>;
}

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

/** Self-contained: renders the trigger button and owns its own payment-form modal. */
export function PayButton({
  ownerId,
  propertyId,
  propertyType,
  balance,
  onPaid,
}: {
  ownerId: string;
  propertyId?: string;
  propertyType?: PropertyTypeKey;
  balance: number;
  onPaid: () => void;
}) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="panel-btn panel-btn-sm"
        disabled={balance >= -0.005}
        onClick={() => setOpen(true)}
      >
        Ödə
      </button>
      {open && auth.status === "authenticated" && (
        <PayModal
          accessToken={auth.accessToken}
          ownerId={ownerId}
          propertyId={propertyId}
          propertyType={propertyType}
          suggestedAmount={balance < 0 ? Math.abs(balance) : 0}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onPaid();
          }}
        />
      )}
    </>
  );
}

/**
 * The payment-entry form itself, usable both inside PayModal (a quick action from
 * a balance row) and embedded directly on the "Ödənişlərin daxil edilməsi" page.
 */
export function PaymentForm({
  accessToken,
  ownerId,
  propertyId,
  propertyType,
  suggestedAmount = 0,
  onSaved,
  onCancel,
}: {
  accessToken: string;
  ownerId: string;
  propertyId?: string | null;
  propertyType?: PropertyTypeKey | null;
  suggestedAmount?: number;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(suggestedAmount.toFixed(2)) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("Cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
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
      await createPayment(accessToken, {
        ownerId,
        amount: numericAmount,
        paymentMethod,
        paymentDate,
        reference: reference || null,
        notes: notes || null,
        propertyId: propertyId ?? null,
        propertyType: propertyType ?? null,
      });
      setAmount("");
      setReference("");
      setNotes("");
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
          <label htmlFor="pay-amount">Məbləğ (₼)</label>
          <input
            id="pay-amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pay-method">Ödəniş üsulu</label>
          <select
            id="pay-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKey)}
          >
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodKey[]).map((key) => (
              <option key={key} value={key}>
                {PAYMENT_METHOD_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="pay-date">Tarix</label>
          <input
            id="pay-date"
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pay-reference">İstinad (qəbz №, tranzaksiya ID və s.)</label>
          <input id="pay-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="pay-notes">Qeyd</label>
        <input id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="panel-btn" onClick={onCancel}>
            Ləğv et
          </button>
        )}
        <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
          {saving ? "Saxlanılır…" : "Qeyd et"}
        </button>
      </div>
    </form>
  );
}

function PayModal({
  accessToken,
  ownerId,
  propertyId,
  propertyType,
  suggestedAmount,
  onClose,
  onSaved,
}: {
  accessToken: string;
  ownerId: string;
  propertyId?: string;
  propertyType?: PropertyTypeKey;
  suggestedAmount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal title="Ödəniş qeyd et" onClose={onClose}>
      <PaymentForm
        accessToken={accessToken}
        ownerId={ownerId}
        propertyId={propertyId}
        propertyType={propertyType}
        suggestedAmount={suggestedAmount}
        onSaved={onSaved}
        onCancel={onClose}
      />
    </Modal>
  );
}

/**
 * Fetches a single apartment/garage's charges, its targeted payments, and its
 * authoritative balance (via getPropertyBalance, which — unlike summing this
 * property's own charges — also counts a targeted payment's unapplied advance:
 * pay 120 for a unit that owes 30 and the other 90 still belongs to this unit
 * as a credit, not to whichever other property happens to be iterated first).
 * ChargesTable/PaymentsTable fetch each row's own allocation breakdown lazily,
 * only when that row is expanded.
 */
export function usePropertyFinance(accessToken: string | undefined, ownerId: string | undefined, propertyId: string) {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!accessToken || !ownerId) {
      Promise.resolve().then(() => {
        setCharges([]);
        setPayments([]);
        setBalance(0);
      });
      return;
    }
    Promise.all([
      getChargesByOwner(accessToken, ownerId),
      getPaymentsByProperty(accessToken, propertyId),
      getPropertyBalance(accessToken, propertyId),
    ])
      .then(([allCharges, targetedPayments, propertyBalance]) => {
        setCharges(allCharges.filter((c) => c.propertyId === propertyId));
        setPayments(targetedPayments);
        setBalance(propertyBalance.currentBalance);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [accessToken, ownerId, propertyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { charges, payments, balance, error, reload };
}

/**
 * Every charge this owner/property was billed, each row showing its own
 * paid/remaining amount directly — no need to cross-reference a separate list to
 * see whether a given charge is settled. Expand a row to see exactly which
 * payment(s) — and how much of each — paid it down.
 */
export function ChargesTable({
  accessToken,
  charges,
  propertyLabels,
}: {
  accessToken: string;
  charges: ChargeResponse[];
  /** Owner-level view only: property.id -> "Mənzil 12 — Bina A" / "Qaraj G5". Adds an "Əmlak" column. */
  propertyLabels?: Record<string, string>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocationsByCharge, setAllocationsByCharge] = useState<Record<string, ChargeAllocationResponse[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const columnCount = propertyLabels ? 7 : 6;

  function toggle(chargeId: string) {
    if (expandedId === chargeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(chargeId);
    if (!allocationsByCharge[chargeId] && accessToken) {
      setLoadingId(chargeId);
      getChargeAllocations(accessToken, chargeId)
        .then((res) => setAllocationsByCharge((prev) => ({ ...prev, [chargeId]: res })))
        .finally(() => setLoadingId(null));
    }
  }

  const sorted = [...charges].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">₼</span>
        Haqqlar
      </h4>
      {sorted.length === 0 ? (
        <p className="panel-page-lead">Hələ heç bir haqq yaranmayıb.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                {propertyLabels && <th>Əmlak</th>}
                <th>Tarix</th>
                <th>Təsvir</th>
                <th>Məbləğ (₼)</th>
                <th>Ödənilib (₼)</th>
                <th>Qalıq (₼)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const remaining = c.amount - c.paidAmount;
                const isOpen = expandedId === c.id;
                const rows = allocationsByCharge[c.id];
                return (
                  <Fragment key={c.id}>
                    <tr>
                      <td>
                        <button type="button" className="panel-btn panel-btn-sm" onClick={() => toggle(c.id)}>
                          {isOpen ? "▲" : "▼"}
                        </button>
                      </td>
                      {propertyLabels && <td>{propertyLabels[c.propertyId] ?? "—"}</td>}
                      <td>{c.createdAt.slice(0, 10)}</td>
                      <td>{chargeDescription(c)}</td>
                      <td>{c.amount.toFixed(2)}</td>
                      <td className={c.paidAmount > 0.005 ? "owner-balance-tag-credit" : undefined}>
                        {c.paidAmount.toFixed(2)}
                      </td>
                      <td className={remaining > 0.005 ? "owner-balance-tag-debt" : undefined}>
                        {remaining.toFixed(2)}
                      </td>
                      <td>
                        <span className="panel-role-tag">{CHARGE_STATUS_LABELS[chargeStatusFromOrdinal(c.status)]}</span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td></td>
                        <td colSpan={columnCount - 1}>
                          {loadingId === c.id ? (
                            <p className="panel-page-lead">Yüklənir…</p>
                          ) : (rows?.length ?? 0) === 0 ? (
                            <p className="panel-page-lead">Bu haqqa hələ heç bir ödəniş tətbiq olunmayıb.</p>
                          ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Ödəniş tarixi</th>
                                  <th>Bu haqqa tətbiq (₼)</th>
                                  <th>Üsul</th>
                                  <th>İstinad</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows!.map((a, i) => (
                                  <tr key={i}>
                                    <td>{a.paymentDate.slice(0, 10)}</td>
                                    <td>{a.allocatedAmount.toFixed(2)}</td>
                                    <td>{PAYMENT_METHOD_LABELS[a.paymentMethod as PaymentMethodKey] ?? a.paymentMethod}</td>
                                    <td>{a.reference ?? "—"}</td>
                                  </tr>
                                ))}
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
    </section>
  );
}

/**
 * Every payment, newest first. Expand a row to see exactly which charge(s) that
 * payment's amount paid for — directly answers "what did this 60 AZN cover?" —
 * plus any leftover portion that's sitting as an unapplied advance.
 */
export function PaymentsTable({
  accessToken,
  payments,
  onCancelPayment,
  propertyLabels,
}: {
  accessToken: string;
  payments: PaymentResponse[];
  onCancelPayment: (paymentId: string) => Promise<void>;
  /** Owner-level view only: property.id -> "Mənzil 12 — Bina A" / "Qaraj G5". Adds a "Hədəf" column. */
  propertyLabels?: Record<string, string>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsByPayment, setDetailsByPayment] = useState<Record<string, PaymentAllocationDetailResponse[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const columnCount = propertyLabels ? 7 : 6;

  function toggle(paymentId: string) {
    if (expandedId === paymentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(paymentId);
    if (!detailsByPayment[paymentId]) {
      setLoadingId(paymentId);
      getPaymentAllocations(accessToken, paymentId)
        .then((res) => setDetailsByPayment((prev) => ({ ...prev, [paymentId]: res })))
        .finally(() => setLoadingId(null));
    }
  }

  async function handleCancel(paymentId: string) {
    if (!window.confirm("Bu ödənişi ləğv etmək istədiyinizə əminsiniz? Əlaqəli borc bərpa olunacaq.")) return;
    setCancellingId(paymentId);
    try {
      await onCancelPayment(paymentId);
    } finally {
      setCancellingId(null);
    }
  }

  const sorted = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">₼</span>
        Ödənişlər
      </h4>
      {sorted.length === 0 ? (
        <p className="panel-page-lead">Hələ heç bir ödəniş edilməyib.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                {propertyLabels && <th>Hədəf</th>}
                <th>Tarix</th>
                <th>Məbləğ (₼)</th>
                <th>Üsul</th>
                <th>İstinad</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const status = paymentStatusFromOrdinal(p.status);
                const isOpen = expandedId === p.id;
                const rows = detailsByPayment[p.id];
                const allocatedTotal = rows?.reduce((sum, r) => sum + r.allocatedAmount, 0) ?? 0;
                const unallocated = p.amount - allocatedTotal;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <button type="button" className="panel-btn panel-btn-sm" onClick={() => toggle(p.id)}>
                          {isOpen ? "▲" : "▼"}
                        </button>
                      </td>
                      {propertyLabels && (
                        <td>{p.propertyId ? propertyLabels[p.propertyId] ?? "—" : "Ümumi"}</td>
                      )}
                      <td>{p.paymentDate.slice(0, 10)}</td>
                      <td>{p.amount.toFixed(2)}</td>
                      <td>{PAYMENT_METHOD_LABELS[paymentMethodFromOrdinal(p.paymentMethod)]}</td>
                      <td>{p.reference ?? "—"}</td>
                      <td>
                        <span className={`panel-role-tag${status === "Cancelled" ? " panel-role-tag-inactive" : ""}`}>
                          {status === "Completed" ? "Tamamlanıb" : status === "Cancelled" ? "Ləğv edilib" : "Gözləyir"}
                        </span>
                      </td>
                      <td>
                        {status !== "Cancelled" && (
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            disabled={cancellingId === p.id}
                            onClick={() => handleCancel(p.id)}
                          >
                            {cancellingId === p.id ? "…" : "Ləğv et"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td></td>
                        <td colSpan={columnCount - 1}>
                          {loadingId === p.id ? (
                            <p className="panel-page-lead">Yüklənir…</p>
                          ) : status === "Cancelled" ? (
                            <p className="panel-page-lead">Bu ödəniş ləğv edilib, heç bir haqqa tətbiq olunmur.</p>
                          ) : (rows?.length ?? 0) === 0 ? (
                            <p className="panel-page-lead">
                              Bu ödəniş hələ heç bir haqqa tətbiq olunmayıb — tam məbləğ avans kimi qalıb.
                            </p>
                          ) : (
                            <>
                              <table className="data-table" style={{ margin: 0 }}>
                                <thead>
                                  <tr>
                                    {propertyLabels && <th>Əmlak</th>}
                                    <th>Haqq</th>
                                    <th>Haqqın məbləği (₼)</th>
                                    <th>Bu ödənişdən tətbiq olunan (₼)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows!.map((r) => (
                                    <tr key={r.chargeId}>
                                      {propertyLabels && <td>{propertyLabels[r.propertyId] ?? "—"}</td>}
                                      <td>{r.description ?? formatPeriod(r.period)}</td>
                                      <td>{r.chargeAmount.toFixed(2)}</td>
                                      <td>{r.allocatedAmount.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {unallocated > 0.005 && (
                                <p className="panel-page-lead" style={{ marginTop: 8 }}>
                                  Bölüşdürülməyən qalıq (avans): <strong>{unallocated.toFixed(2)} ₼</strong>
                                </p>
                              )}
                            </>
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
    </section>
  );
}
