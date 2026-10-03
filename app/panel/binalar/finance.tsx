"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanPay } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/format";
import { QueryComparisonType, SortDirection } from "../../lib/api/buildings";
import { resolvePropertyLabels, type PropertyRef } from "./resolve";
import {
  type ChargeAllocationResponse,
  type ChargeResponse,
  type PaymentAllocationDetailResponse,
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
  propertyTypeFromOrdinal,
  rateTypeFromOrdinal,
  searchAuditLogs,
  searchCharges,
  searchPayments,
} from "../../lib/api/payments";

const AZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

/** "2026-09" -> "Sentyabr 2026". Falls through unchanged for anything else (e.g. a manual charge's own period tag). */
function formatPeriod(period: string | null): string {
  if (!period) return "—";
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
export function chargeDescription(c: ChargeResponse): string {
  const rateType = c.rateType != null ? rateTypeFromOrdinal(c.rateType) : null;
  const periodLabel = formatPeriod(c.period);

  if (rateType === "PerSquareMeter" && c.areaSquareMeters != null && c.rateAmount != null) {
    return `Aylıq mənzil haqqı (${periodLabel}): ${c.areaSquareMeters.toFixed(2)} m² × ${c.rateAmount.toFixed(2)} ₼/m²`;
  }
  if (rateType === "FixedGarage" && c.rateAmount != null) {
    return `Aylıq qaraj haqqı (${periodLabel}): sabit ${c.rateAmount.toFixed(2)} ₼`;
  }
  // Manual (one-off) charges already carry a human-written reason.
  return c.description ?? `Haqq (${periodLabel})`;
}

/** Status says "what's going on" in words; the colour says "good/bad/in-between"
 *  at a glance without reading it — Paid/Completed green, Unpaid red,
 *  PartiallyPaid/Pending amber. Cancelled stays neutral: it's voided, not owed. */
export function chargeStatusTagClass(status: string): string {
  if (status === "Paid") return "panel-role-tag-good";
  if (status === "PartiallyPaid") return "panel-role-tag-warn";
  if (status === "Unpaid") return "panel-role-tag-bad";
  return "";
}

export function paymentStatusTagClass(status: string): string {
  return status === "Completed" ? "panel-role-tag-good" : "panel-role-tag-warn";
}

/** Sum of (paid - amount) across charges: negative = debt, positive = advance/credit.
 *  Only correct when every payment involved has fully settled into a charge — see
 *  getPropertyBalance/getOwnerBalance for the authoritative figure, which also
 *  accounts for a targeted payment's unapplied advance portion. */
export function balanceFromCharges(charges: ChargeResponse[]): number {
  return charges.reduce((sum, c) => sum + (c.paidAmount - c.amount), 0);
}

export function lastPaymentDate(payments: PaymentResponse[]): string | null {
  if (payments.length === 0) return null;
  return payments.reduce((latest, p) => (p.paymentDate > latest ? p.paymentDate : latest), payments[0].paymentDate);
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
  const canPay = useCanPay();
  const [open, setOpen] = useState(false);

  if (!canPay) return null;

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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Əmlaka hədəflənmiş ödəniş yalnız həmin əmlakın qalıq borcunu ödəyə bilər —
  // artıq (avans) yalnız sahib səviyyəli (əmlaksız) ödənişdə yaranır. Backend
  // də bu qaydanı təsdiqləyir (Payment.ExceedsPropertyDebt), burada isə UX üçün
  // eyni məhdudluq formada göstərilir.
  const targeted = Boolean(propertyId);
  const maxAmount = targeted ? Math.max(0, suggestedAmount) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }
    if (maxAmount !== null && numericAmount > maxAmount + 0.005) {
      setError(
        `Əmlak üzrə ödəniş qalıq borcdan böyük ola bilməz (borc: ${maxAmount.toFixed(2)} ₼). ` +
          "Avans üçün əmlak seçmədən ümumi sahib ödənişi edin.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPayment(accessToken, {
        ownerId,
        amount: numericAmount,
        paymentMethod: "Cash",
        notes: notes || null,
        propertyId: propertyId ?? null,
        propertyType: propertyType ?? null,
      });
      setAmount("");
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
      <div className="form-field">
        <label htmlFor="pay-amount">Məbləğ (₼){maxAmount !== null && ` — borc: ${maxAmount.toFixed(2)}`}</label>
        <input
          id="pay-amount"
          type="number"
          min={0.01}
          step="0.01"
          required
          max={maxAmount ?? undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
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
 * Mülkiyyət əməliyyatları üçün borc qapısı (transfer / sahibin çıxarılması):
 * `active` true olan kimi əmlakın balansı birbaşa API-dan çəkilir və qalıq borc
 * hesablanır. `blocked` yoxlama davam edəndə, yoxlama alınmadıqda və ya borc
 * qalandıqda true-dur — əməliyyat yalnız false olanda icazələnir. Göndərmə
 * anında `checkDebt()`-i təkrar çağırmaq modal açıldıqdan sonra yaranmış yeni
 * borcu da tutur (null = yoxlama alınmadı).
 */
export function usePropertyDebtGate(accessToken: string | undefined, propertyId: string, active: boolean) {
  const [checking, setChecking] = useState(false);
  const [debt, setDebt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkDebt = useCallback(async (): Promise<number | null> => {
    if (!accessToken) return null;
    setChecking(true);
    setError(null);
    try {
      const balance = await getPropertyBalance(accessToken, propertyId);
      const outstanding = Math.max(0, -balance.currentBalance);
      setDebt(outstanding);
      return outstanding;
    } catch (err) {
      setError(errorMessage(err));
      setDebt(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, [accessToken, propertyId]);

  useEffect(() => {
    if (active) {
      checkDebt();
    } else {
      setDebt(null);
      setError(null);
    }
  }, [active, checkDebt]);

  const blocked = checking || error !== null || (debt ?? 0) > 0.005;

  return { checking, debt, error, blocked, checkDebt };
}

/**
 * Every charge this owner/property was billed, each row showing its own
 * paid/remaining amount directly — no need to cross-reference a separate list to
 * see whether a given charge is settled. Click a row to open a modal with
 * exactly which payment(s) — and how much of each — paid it down.
 */
export function ChargesTable({
  accessToken,
  charges,
  propertyLabels,
  title = "Haqqlar",
}: {
  accessToken: string;
  charges: ChargeResponse[];
  /** Owner-level view only: property.id -> "Mənzil 12 — Bina A" / "Qaraj G5". Adds an "Əmlak" column. */
  propertyLabels?: Record<string, string>;
  /** Apartment/garage pages show no separate PaymentsTable — a row's own detail modal
   *  already answers "which payment(s) cleared it", so this card speaks for both. */
  title?: string;
}) {
  const [openCharge, setOpenCharge] = useState<ChargeResponse | null>(null);

  const sorted = [...charges].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">₼</span>
        {title}
      </h4>
      {sorted.length === 0 ? (
        <p className="panel-page-lead">Hələ heç bir haqq yaranmayıb.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {propertyLabels && <th>Əmlak</th>}
                <th>Hesablanma tarixi</th>
                <th>Təsvir</th>
                <th>Məbləğ (₼)</th>
                <th>Ödənilib (₼)</th>
                <th>Qalıq borc (₼)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const remaining = c.amount - c.paidAmount;
                return (
                  <tr key={c.id} className="data-table-row-clickable" onClick={() => setOpenCharge(c)}>
                    {propertyLabels && <td>{c.propertyId ? propertyLabels[c.propertyId] ?? "—" : "—"}</td>}
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td>{chargeDescription(c)}</td>
                    <td>{c.amount.toFixed(2)}</td>
                    <td className={c.paidAmount > 0.005 ? "owner-balance-tag-credit" : undefined}>
                      {c.paidAmount.toFixed(2)}
                    </td>
                    <td className={remaining > 0.005 ? "owner-balance-tag-debt" : undefined}>
                      {remaining.toFixed(2)}
                    </td>
                    <td>
                      <span className={`panel-role-tag ${chargeStatusTagClass(chargeStatusFromOrdinal(c.status))}`}>
                        {CHARGE_STATUS_LABELS[chargeStatusFromOrdinal(c.status)]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {openCharge && (
        <ChargeDetailModal accessToken={accessToken} charge={openCharge} onClose={() => setOpenCharge(null)} />
      )}
    </section>
  );
}

/**
 * "Kim yaradıb?" — hər entity dəyişikliyi avtomatik AuditLogs-a yazılır (EF
 * SaveChanges interceptor), bu sadəcə həmin entity üçün "Created" qeydini
 * tapıb yaradan istifadəçinin adını qaytarır. Entity heç vaxt silinmədiyi
 * üçün "Created" = yeganə/ilk qeyd, əlavə sort-a ehtiyac yoxdur.
 */
export type AuditableEntityType =
  | "Charge"
  | "Payment"
  | "Vendor"
  | "Contract"
  | "Rate"
  | "Transaction"
  | "OwnerBalance"
  | "PaymentAllocation"
  | "ContractService";

export function useCreatedBy(accessToken: string, entityType: AuditableEntityType, entityId: string) {
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    searchAuditLogs(accessToken, {
      filters: [
        { columnName: "EntityType", comparison: QueryComparisonType.Equals, value: entityType },
        { columnName: "EntityId", comparison: QueryComparisonType.Equals, value: entityId },
        { columnName: "Action", comparison: QueryComparisonType.Equals, value: "Created" },
      ],
      pageSize: 1,
    })
      .then((res) => setCreatedBy(res.auditLogs[0]?.user?.name ?? null))
      .catch(() => setCreatedBy(null));
  }, [accessToken, entityType, entityId]);

  return createdBy;
}

/**
 * `useCreatedBy`-ın toplu versiyası — bir siyahıdaki ONLARLA sətir üçün hərəsinə
 * ayrıca sorğu göndərmək əvəzinə, bu entity tipinin BÜTÜN "Created" qeydlərini
 * bir dəfəyə çəkib entityId -> ad lüğəti qaytarır (TariflarView, Tranzaksiyalar,
 * Müqavilə xidmətləri, ödəniş bölgüsü sətirləri kimi siyahı görünüşləri üçün).
 */
export function useCreatedByMap(accessToken: string, entityType: AuditableEntityType, pageSize = 200) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    searchAuditLogs(accessToken, {
      filters: [
        { columnName: "EntityType", comparison: QueryComparisonType.Equals, value: entityType },
        { columnName: "Action", comparison: QueryComparisonType.Equals, value: "Created" },
      ],
      pageSize,
    })
      .then((res) => {
        const next: Record<string, string> = {};
        res.auditLogs.forEach((l) => {
          if (l.user) next[l.entityId] = l.user.name;
        });
        setMap(next);
      })
      .catch(() => setMap({}));
  }, [accessToken, entityType, pageSize]);

  return map;
}

/**
 * A charge's own detail: what it was for, its paid/remaining state, and
 * exactly which payment(s) — and how much of each — paid it down. Fetched
 * lazily, once, when opened — mirrors PaymentDetailModal's click-to-open
 * pattern instead of an inline expand/dropdown row.
 */
export function ChargeDetailModal({
  accessToken,
  charge,
  onClose,
}: {
  accessToken: string;
  charge: ChargeResponse;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ChargeAllocationResponse[] | null>(null);
  const remaining = charge.amount - charge.paidAmount;
  const createdBy = useCreatedBy(accessToken, "Charge", charge.id);
  const allocationCreators = useCreatedByMap(accessToken, "PaymentAllocation");

  useEffect(() => {
    getChargeAllocations(accessToken, charge.id).then(setRows);
  }, [accessToken, charge.id]);

  return (
    <Modal title="Haqq təfərrüatı" onClose={onClose}>
      <div className="payment-document">
        <div className="payment-document-head">
          <div className="payment-document-field">
            <span className="payment-document-label">Tarix</span>
            <strong>{formatDateTime(charge.createdAt)}</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Məbləğ</span>
            <strong>{charge.amount.toFixed(2)} ₼</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Ödənilib</span>
            <strong>{charge.paidAmount.toFixed(2)} ₼</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Status</span>
            <span className={`panel-role-tag ${chargeStatusTagClass(chargeStatusFromOrdinal(charge.status))}`}>
              {CHARGE_STATUS_LABELS[chargeStatusFromOrdinal(charge.status)]}
            </span>
          </div>
        </div>

        {createdBy && (
          <p className="payment-document-byline">
            Əməliyyatı icra etdi: <strong>{createdBy}</strong>
          </p>
        )}

        <div className="payment-document-divider" />

        <p className="payment-document-statement">{chargeDescription(charge)}.</p>

        <h5 className="payment-document-section-title">Bölgü — bu haqqı hansı ödənişlər qarşılayıb</h5>

        {rows === null ? (
          <p className="payment-document-statement">Bölgü məlumatı yüklənir…</p>
        ) : rows.length === 0 ? (
          <p className="payment-document-statement">Bu haqqa hələ heç bir ödəniş tətbiq olunmayıb.</p>
        ) : (
          <table className="data-table payment-document-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Ödəniş tarixi</th>
                <th>Bu haqqa tətbiq (₼)</th>
                <th>Qalıq (₼)</th>
                <th>İcra edən</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={i}>
                  <td>{formatDateTime(a.paymentDate)}</td>
                  <td>{a.allocatedAmount.toFixed(2)}</td>
                  <td className={a.remainingDebtAfterPayment > 0.005 ? "owner-balance-tag-debt" : "owner-balance-tag-credit"}>
                    {a.remainingDebtAfterPayment.toFixed(2)}
                  </td>
                  <td>{allocationCreators[a.id] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {rows !== null && rows.length === 0 && remaining > 0.005 && (
          <p className="payment-document-statement" style={{ marginTop: 12 }}>
            Qalıq borc: <strong className="owner-balance-tag-debt">{remaining.toFixed(2)} ₼</strong>
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Every payment, newest first — one compact row each. Click a row to open a
 * modal with the full breakdown: exactly which charge(s) that payment's
 * amount paid for, and how much of each — directly answers "what did this
 * 100 AZN cover?" — plus any leftover portion sitting as an unapplied advance.
 */
export function PaymentsTable({
  accessToken,
  payments,
  propertyLabels,
  title = "Ödənişlər",
}: {
  accessToken: string;
  payments: PaymentResponse[];
  /** Owner-level view only: property.id -> "Mənzil 12 — Bina A" / "Qaraj G5". Not
   *  shown as its own list column anymore — only used inside the detail modal's
   *  allocation statement, where a payment spanning several units needs to say
   *  which one each charge belongs to. */
  propertyLabels?: Record<string, string>;
  title?: string;
}) {
  const [openPayment, setOpenPayment] = useState<PaymentResponse | null>(null);
  const sorted = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">₼</span>
        {title}
      </h4>
      {sorted.length === 0 ? (
        <p className="panel-page-lead">Hələ heç bir ödəniş edilməyib.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ödəniş tarixi</th>
                <th>Məbləğ (₼)</th>
                <th>Üsul</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const status = paymentStatusFromOrdinal(p.status);
                return (
                  <tr key={p.id} className="data-table-row-clickable" onClick={() => setOpenPayment(p)}>
                    <td>{formatDateTime(p.paymentDate)}</td>
                    <td>{p.amount.toFixed(2)}</td>
                    <td>{PAYMENT_METHOD_LABELS[paymentMethodFromOrdinal(p.paymentMethod)]}</td>
                    <td>
                      <span className={`panel-role-tag ${paymentStatusTagClass(status)}`}>
                        {status === "Completed" ? "Tamamlanıb" : "Gözləyir"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {openPayment && (
        <PaymentDetailModal
          accessToken={accessToken}
          payment={openPayment}
          propertyLabels={propertyLabels}
          onClose={() => setOpenPayment(null)}
        />
      )}
    </section>
  );
}

/**
 * The "where did my 100 AZN go" receipt — fetched lazily, once, when opened.
 * A formal statement (what was paid, when, how) up top, then an itemised
 * table of exactly which debt(s) it settled — like a real payment receipt.
 */
export function PaymentDetailModal({
  accessToken,
  payment,
  propertyLabels,
  onClose,
}: {
  accessToken: string;
  payment: PaymentResponse;
  propertyLabels?: Record<string, string>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<PaymentAllocationDetailResponse[] | null>(null);
  const createdBy = useCreatedBy(accessToken, "Payment", payment.id);
  const allocationCreators = useCreatedByMap(accessToken, "PaymentAllocation");

  useEffect(() => {
    getPaymentAllocations(accessToken, payment.id).then(setRows);
  }, [accessToken, payment.id]);

  const allocatedTotal = rows?.reduce((sum, r) => sum + r.allocatedAmount, 0) ?? 0;
  const unallocated = payment.amount - allocatedTotal;
  const status = paymentStatusFromOrdinal(payment.status);
  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethodFromOrdinal(payment.paymentMethod)];

  return (
    <Modal title="Ödəniş sənədi" onClose={onClose} wide>
      <div className="payment-document">
        <div className="payment-document-head">
          <div className="payment-document-field">
            <span className="payment-document-label">Sənəd №</span>
            <strong>{payment.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Tarix</span>
            <strong>{formatDateTime(payment.paymentDate)}</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Məbləğ</span>
            <strong>{payment.amount.toFixed(2)} ₼</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Ödəniş üsulu</span>
            <strong>{methodLabel}</strong>
          </div>
          <div className="payment-document-field">
            <span className="payment-document-label">Status</span>
            <span className={`panel-role-tag ${paymentStatusTagClass(status)}`}>
              {status === "Completed" ? "Tamamlanıb" : "Gözləyir"}
            </span>
          </div>
        </div>

        {createdBy && (
          <p className="payment-document-byline">
            Əməliyyatı icra etdi: <strong>{createdBy}</strong>
          </p>
        )}

        <div className="payment-document-divider" />

        <p className="payment-document-statement">
          <strong>{formatDateTime(payment.paymentDate)}</strong> tarixində {methodLabel.toLowerCase()} üsulu ilə{" "}
          <strong>{payment.amount.toFixed(2)} ₼</strong> məbləğində ödəniş qeydə alınıb.
        </p>
        {payment.notes && <p className="payment-document-statement">Qeyd: {payment.notes}.</p>}

        <h5 className="payment-document-section-title">Bölgü — bu ödəniş haraya getdi</h5>

        {rows === null ? (
          <p className="payment-document-statement">Bölgü məlumatı yüklənir…</p>
        ) : rows.length === 0 ? (
          <p className="payment-document-statement">
            Bu ödəniş hələ heç bir haqqa tətbiq olunmayıb — tam {payment.amount.toFixed(2)} ₼ sahibin hesabında
            avans kimi saxlanılır.
          </p>
        ) : (
          <>
            <table className="data-table payment-document-table" style={{ margin: "0 0 12px" }}>
              <thead>
                <tr>
                  {propertyLabels && <th>Əmlak</th>}
                  <th>Haqq</th>
                  <th>Məbləğ (₼)</th>
                  <th>Tətbiq (₼)</th>
                  <th>Qalıq (₼)</th>
                  <th>İcra edən</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.chargeId}>
                    {propertyLabels && <td>{r.propertyId ? propertyLabels[r.propertyId] ?? "—" : "—"}</td>}
                    <td>{r.description ?? formatPeriod(r.period)}</td>
                    <td>{r.chargeAmount.toFixed(2)}</td>
                    <td>{r.allocatedAmount.toFixed(2)}</td>
                    <td className={r.remainingDebtAfterPayment > 0.005 ? "owner-balance-tag-debt" : "owner-balance-tag-credit"}>
                      {r.remainingDebtAfterPayment.toFixed(2)}
                    </td>
                    <td>{allocationCreators[r.id] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unallocated > 0.005 && (
              <p className="payment-document-statement">
                Qalan <strong>{unallocated.toFixed(2)} ₼</strong> sahibin hesabında avans kimi saxlanılır və
                növbəti haqqa avtomatik tətbiq olunacaq.
              </p>
            )}
          </>
        )}

        {status !== "Completed" && (
          <p className="payment-document-statement">Qeyd: bu ödəniş hələ gözləmə statusundadır, tamamlanmayıb.</p>
        )}
      </div>
    </Modal>
  );
}

const OWNER_PANEL_PAGE_SIZE = 8;

/**
 * Owner-level Haqqlar list, server-side searched + paginated through the
 * existing /charges/search endpoint (filtered to this owner via PartyId —
 * the entity's real column name; ChargeResponse.ownerId is just the DTO
 * field). Used on the owner's own "Mənim profilim" page, where plain
 * getChargesByOwner + ChargesTable would otherwise dump every charge ever
 * issued into one unpaginated table.
 */
export function OwnerChargesPanel({ accessToken, ownerId }: { accessToken: string; ownerId: string }) {
  const [items, setItems] = useState<ChargeResponse[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [propertyLabels, setPropertyLabels] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [openCharge, setOpenCharge] = useState<ChargeResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setPage(1);
  }

  useEffect(() => {
    searchCharges(accessToken, {
      filters: [{ columnName: "PartyId", comparison: QueryComparisonType.Equals, value: ownerId }],
      sortCriteria: { columnName: "CreatedAt", direction: SortDirection.Descending },
      searchTerm: searchTerm || undefined,
      page: page - 1,
      pageSize: OWNER_PANEL_PAGE_SIZE,
    }).then((res) => {
      setItems(res.charges);
      setTotalCount(res.totalCount);
      const refs: PropertyRef[] = res.charges
        .filter((c) => c.propertyId != null && c.propertyType != null)
        .map((c) => ({ propertyType: propertyTypeFromOrdinal(c.propertyType!), propertyId: c.propertyId! }));
      resolvePropertyLabels(accessToken, refs).then(setPropertyLabels);
    });
  }, [accessToken, ownerId, searchTerm, page]);

  const pageCount = Math.max(1, Math.ceil(totalCount / OWNER_PANEL_PAGE_SIZE));

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">₼</span>
        Haqqlar
      </h4>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (təsvir, dövr…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      {items === null ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : items.length === 0 ? (
        <p className="panel-page-lead">Nəticə tapılmadı.</p>
      ) : (
        <>
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Əmlak</th>
                  <th>Təsvir</th>
                  <th>Tarix</th>
                  <th>Qalıq (₼)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const remaining = c.amount - c.paidAmount;
                  return (
                    <tr key={c.id} className="data-table-row-clickable" onClick={() => setOpenCharge(c)}>
                      <td className="owner-charge-col-property">
                        {c.propertyId ? propertyLabels[c.propertyId] ?? "…" : "—"}
                      </td>
                      <td className="owner-charge-col-desc">{chargeDescription(c)}</td>
                      <td>{formatDateTime(c.createdAt)}</td>
                      <td className={remaining > 0.005 ? "owner-balance-tag-debt" : undefined}>
                        {remaining.toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`panel-role-tag ${chargeStatusTagClass(chargeStatusFromOrdinal(c.status))}`}
                        >
                          {CHARGE_STATUS_LABELS[chargeStatusFromOrdinal(c.status)]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="panel-pagination panel-pagination-bordered">
            <span>
              Cəmi {totalCount} haqq — səhifə {page}/{pageCount}
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
        </>
      )}
      {openCharge && (
        <ChargeDetailModal accessToken={accessToken} charge={openCharge} onClose={() => setOpenCharge(null)} />
      )}
    </section>
  );
}

/**
 * Owner-level Ödənişlər list — same server-side search + pagination
 * approach as OwnerChargesPanel, via /payments/search filtered by PartyId.
 */
export function OwnerPaymentsPanel({ accessToken, ownerId }: { accessToken: string; ownerId: string }) {
  const [items, setItems] = useState<PaymentResponse[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [propertyLabels, setPropertyLabels] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [openPayment, setOpenPayment] = useState<PaymentResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setPage(1);
  }

  useEffect(() => {
    searchPayments(accessToken, {
      filters: [{ columnName: "PartyId", comparison: QueryComparisonType.Equals, value: ownerId }],
      sortCriteria: { columnName: "PaymentDate", direction: SortDirection.Descending },
      searchTerm: searchTerm || undefined,
      page: page - 1,
      pageSize: OWNER_PANEL_PAGE_SIZE,
    }).then((res) => {
      setItems(res.payments);
      setTotalCount(res.totalCount);
      const refs: PropertyRef[] = res.payments
        .filter((p) => p.propertyId != null && p.propertyType != null)
        .map((p) => ({ propertyType: propertyTypeFromOrdinal(p.propertyType!), propertyId: p.propertyId! }));
      resolvePropertyLabels(accessToken, refs).then(setPropertyLabels);
    });
  }, [accessToken, ownerId, searchTerm, page]);

  const pageCount = Math.max(1, Math.ceil(totalCount / OWNER_PANEL_PAGE_SIZE));

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">₼</span>
        Ödənişlər
      </h4>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (qeyd…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      {items === null ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : items.length === 0 ? (
        <p className="panel-page-lead">Nəticə tapılmadı.</p>
      ) : (
        <>
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ödəniş tarixi</th>
                  <th>Məbləğ (₼)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  return (
                    <tr key={p.id} className="data-table-row-clickable" onClick={() => setOpenPayment(p)}>
                      <td>{formatDateTime(p.paymentDate)}</td>
                      <td>{p.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="panel-pagination panel-pagination-bordered">
            <span>
              Cəmi {totalCount} ödəniş — səhifə {page}/{pageCount}
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
        </>
      )}
      {openPayment && (
        <PaymentDetailModal
          accessToken={accessToken}
          payment={openPayment}
          propertyLabels={propertyLabels}
          onClose={() => setOpenPayment(null)}
        />
      )}
    </section>
  );
}
