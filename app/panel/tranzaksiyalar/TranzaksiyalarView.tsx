"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanPay } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import { SortDirection } from "../../lib/api/buildings";
import { formatDateTime } from "../../lib/format";
import {
  TRANSACTION_DIRECTION_LABELS,
  exportPaymentReceipt,
  getPayment,
  getPaymentAllocations,
  PAYMENT_METHOD_LABELS,
  paymentMethodFromOrdinal,
  paymentStatusFromOrdinal,
  searchTransactions,
  transactionDirectionFromOrdinal,
  type TransactionDirectionKey,
  type TransactionDocumentType,
  type TransactionResponse,
} from "../../lib/api/payments";
import { useCreatedByMap } from "../binalar/finance";
import { Modal } from "../Modal";
import { SignedDocumentsPanel } from "../SignedDocuments";
import { getPurchase, purchaseStatusLabel, type PurchaseResponse } from "../../lib/api/purchases-client";
import type { PaymentAllocationDetailResponse, PaymentResponse } from "../../lib/api/payments";

// Fetched unfiltered/unpaged from the API (large flat pull, sorted newest first) —
// the date range below is applied client-side. The generic QueryFilter mechanism
// doesn't reliably convert date strings server-side, so this sidesteps that
// entirely instead of shipping a range picker that silently does nothing.
const FETCH_SIZE = 500;

const MONTHS_AZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "İyun",
  "İyul",
  "Avqust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];

// Ledger rows are written by the backend, never by hand: resident and vendor
// payments post income and expense entries respectively.
type Row = {
  key: string;
  id: string;
  date: string;
  kind: "income" | "expense";
  direction: TransactionDirectionKey;
  category: string;
  note: string;
  amount: number; // signed: income positive, expense negative
  // Set only for a row auto-posted from a resident/vendor payment — see
  // TransactionResponse.sourcePaymentId.
  sourcePaymentId: string | null;
  sourcePurchaseId: string | null;
  documentType: TransactionDocumentType;
  referenceId: string;
};

type MonthGroup = {
  key: string;
  label: string;
  rows: Row[];
  income: number;
  expense: number;
};

type KindFilter = "all" | "income" | "expense";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatMoney(amount: number) {
  return `${money.format(Math.abs(amount))} ₼`;
}

function formatSigned(amount: number) {
  if (Math.abs(amount) < 0.005) return "0,00 ₼";
  return `${amount > 0 ? "+" : "−"}${formatMoney(amount)}`;
}

// Local calendar date (never toISOString(), which would shift the day in UTC+ zones).
function toIsoDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function today() {
  return toIsoDate(new Date());
}

function currentMonthRange() {
  const now = new Date();
  return {
    start: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function previousMonthRange() {
  const now = new Date();
  return {
    start: toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

function currentYearRange() {
  const now = new Date();
  return { start: toIsoDate(new Date(now.getFullYear(), 0, 1)), end: today() };
}

// Compared as real instants (epoch ms), not strings: .NET's default
// System.Text.Json DateTimeOffset serializer writes an explicit numeric offset
// ("...+00:00"), never JavaScript's "...Z" — lexicographic string comparison
// between the two ('+' sorts before '.') wrongly excludes same-day rows, which
// is exactly why a transaction dated today could vanish from "Bu ay" while still
// showing up under "Hamısı". The day a UTC timestamp belongs to is its UTC day.
function rangeStartMs(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function rangeEndMs(date: string) {
  return new Date(`${date}T23:59:59.999Z`).getTime();
}

function formatDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTHS_AZ[Number(month) - 1] ?? month} ${year}`;
}

function groupByMonth(rows: Row[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const row of rows) {
    const key = row.date.slice(0, 7);
    let group = groups.get(key);

    if (!group) {
      group = { key, label: monthLabel(key), rows: [], income: 0, expense: 0 };
      groups.set(key, group);
    }

    group.rows.push(row);
    if (row.amount > 0) group.income += row.amount;
    else group.expense += Math.abs(row.amount);
  }

  // rows arrive sorted newest first, so insertion order is newest month first too
  return [...groups.values()];
}

const QUICK_RANGES: { key: string; label: string; range: () => { start: string; end: string } }[] = [
  { key: "current-month", label: "Bu ay", range: currentMonthRange },
  { key: "previous-month", label: "Keçən ay", range: previousMonthRange },
  { key: "current-year", label: "Bu il", range: currentYearRange },
  { key: "all", label: "Hamısı", range: () => ({ start: "", end: "" }) },
];

export function TranzaksiyalarView() {
  const auth = useAuth();
  const canUploadDocuments = useCanPay();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => currentMonthRange().start);
  const [endDate, setEndDate] = useState(() => currentMonthRange().end);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [docTarget, setDocTarget] = useState<Row | null>(null);
  const transactionCreators = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "Transaction");

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    searchTransactions(auth.accessToken, {
      sortCriteria: { columnName: "TransactionDate", direction: SortDirection.Descending },
      pageSize: FETCH_SIZE,
    })
      .then((res) => {
        setTransactions(res.transactions);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  if (auth.status !== "authenticated") return null;

  const allRows: Row[] = transactions
    .map((t): Row => {
      const direction: TransactionDirectionKey = transactionDirectionFromOrdinal(t.direction);
      return {
        key: `transaction-${t.id}`,
        id: t.id,
        date: t.transactionDate,
        kind: direction === "Income" ? "income" : "expense",
        direction,
        category: t.category,
        note: t.description ?? "—",
        amount: direction === "Income" ? t.amount : -t.amount,
        sourcePaymentId: t.sourcePaymentId,
        sourcePurchaseId: t.sourcePurchaseId,
        documentType: t.documentType,
        referenceId: t.referenceId,
      };
    })
    // Real instants, not strings — same reasoning as rangeStartMs/rangeEndMs below.
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const term = search.trim().toLowerCase();
  const rows = allRows.filter((row) => {
    const rowMs = new Date(row.date).getTime();
    if (startDate && rowMs < rangeStartMs(startDate)) return false;
    if (endDate && rowMs > rangeEndMs(endDate)) return false;
    if (kindFilter !== "all" && row.kind !== kindFilter) return false;
    if (term && !row.category.toLowerCase().includes(term) && !row.note.toLowerCase().includes(term)) return false;
    return true;
  });

  const totalIncome = rows.reduce((sum, r) => (r.amount > 0 ? sum + r.amount : sum), 0);
  const totalExpense = rows.reduce((sum, r) => (r.amount < 0 ? sum + Math.abs(r.amount) : sum), 0);
  const net = totalIncome - totalExpense;
  const groups = groupByMonth(rows);

  const periodCaption = (() => {
    if (!startDate && !endDate) return "Bütün tarix";
    const from = startDate ? formatDate(startDate) : "əvvəldən";
    const to = endDate ? formatDate(endDate) : "bu günə";
    return `${from} – ${to}`;
  })();

  return (
    <div className="panel-page">
      <div className="panel-page-head">
        <div>
          <h1>Tranzaksiyalar</h1>
          <p className="panel-page-lead">
            Sakin ödənişləri avtomatik gəlir qeydi kimi düşür, ləğv edilən ödəniş isə geri qaytarma qeydi yaradır.
          </p>
        </div>
        <span className="ledger-badge">Avtomatik jurnal</span>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      <div className="ledger-stats">
        <article className="ledger-stat ledger-stat-in">
          <span className="ledger-stat-label">Daxilolma</span>
          <strong className="ledger-value-in">{formatMoney(totalIncome)}</strong>
          <span className="ledger-stat-caption">{periodCaption}</span>
        </article>
        <article className="ledger-stat ledger-stat-out">
          <span className="ledger-stat-label">Xərc</span>
          <strong className="ledger-value-out">{formatMoney(totalExpense)}</strong>
          <span className="ledger-stat-caption">{periodCaption}</span>
        </article>
        <article className="ledger-stat ledger-stat-net">
          <span className="ledger-stat-label">Xalis</span>
          <strong className={net < 0 ? "ledger-value-out" : "ledger-value-in"}>{formatSigned(net)}</strong>
          <span className="ledger-stat-caption">{rows.length} əməliyyat</span>
        </article>
      </div>

      <section className="panel-card ledger-filters">
        <div className="ledger-filter-fields">
          <div className="form-field">
            <label htmlFor="tx-start">Başlanğıc</label>
            <input id="tx-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="tx-end">Son</label>
            <input id="tx-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="tx-search">Axtarış</label>
            <input
              id="tx-search"
              className="panel-search"
              placeholder="Kateqoriya və ya qeyd üzrə…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="ledger-filter-footer">
          <div className="ledger-segmented" role="group" aria-label="Tranzaksiya növü">
            {(["all", "income", "expense"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kindFilter === value}
                className={kindFilter === value ? "active" : ""}
                onClick={() => setKindFilter(value)}
              >
                {value === "all" ? "Hamısı" : value === "income" ? "Gəlir" : "Xərc"}
              </button>
            ))}
          </div>

          <div className="ledger-quick">
            {QUICK_RANGES.map((preset) => {
              const range = preset.range();
              const isActive = startDate === range.start && endDate === range.end;
              return (
                <button
                  key={preset.key}
                  type="button"
                  className={`ledger-chip${isActive ? " active" : ""}`}
                  onClick={() => {
                    setStartDate(range.start);
                    setEndDate(range.end);
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="data-table-wrap">
        <div className="ledger-table-head">
          <h3>Əməliyyatlar</h3>
          <span className="ledger-count">{rows.length} qeyd</span>
        </div>

        {loading ? (
          <div className="ledger-skeletons" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="ledger-skeleton" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="ledger-empty">
            <span aria-hidden="true">₼</span>
            <strong>Bu aralıqda tranzaksiya yoxdur</strong>
            <p>Tarix aralığını genişləndirin və ya axtarışı təmizləyin.</p>
          </div>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table ledger-table">
              <colgroup>
                <col className="ledger-col-date" />
                <col className="ledger-col-type" />
                <col className="ledger-col-category" />
                <col className="ledger-col-note" />
                <col className="ledger-col-amount" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Növ</th>
                  <th>Kateqoriya</th>
                  <th>Qeyd</th>
                  <th className="ledger-th-amount">Məbləğ (₼)</th>
                  <th>Yaradan</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const groupNet = group.income - group.expense;
                  return (
                    <Fragment key={group.key}>
                      <tr className="ledger-month-row">
                        <td colSpan={6}>
                          <span className="ledger-month-name">{group.label}</span>
                          <span className="ledger-month-meta">
                            {group.rows.length} əməliyyat · Daxilolma {formatMoney(group.income)} · Xərc{" "}
                            {formatMoney(group.expense)}
                          </span>
                          <span className={`ledger-month-net ${groupNet < 0 ? "ledger-value-out" : "ledger-value-in"}`}>
                            Xalis {formatSigned(groupNet)}
                          </span>
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr
                          key={row.key}
                          className="data-table-row-clickable"
                          title="Əlaqəli sənədə bax"
                          onClick={() => setDocTarget(row)}
                        >
                          <td className="ledger-cell-date">{formatDateTime(row.date)}</td>
                          <td>
                            <span className={`ledger-type ledger-type-${row.kind}`}>
                              {TRANSACTION_DIRECTION_LABELS[row.direction]}
                            </span>
                          </td>
                          <td title={row.category}>{row.category}</td>
                          <td className="ledger-cell-note" title={row.note}>
                            {row.note}
                          </td>
                          <td className={`ledger-cell-amount ${row.amount < 0 ? "ledger-value-out" : "ledger-value-in"}`}>
                            {formatSigned(row.amount)}
                          </td>
                          <td>{transactionCreators[row.id] ?? "—"}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="ledger-note">
        Sakin/tədarükçü ödənişindən yaranan qeydlər avtomatikdir və silinə bilməz — ödəniş ləğv edildikdə əvvəlki
        qeyd silinmir, ona əks (geri qaytarma) qeydi əlavə olunur. Vendor/müqaviləyə bağlı olmayan birbaşa xərc və
        gəlirlər isə Xərclərin daxil edilməsi / Əlavə gəlirlər bölmələrindən əlavə olunur.
      </p>

      {docTarget && (
        <TransactionDocumentModal
          row={docTarget}
          accessToken={auth.accessToken}
          canUploadDocuments={canUploadDocuments}
          onClose={() => setDocTarget(null)}
        />
      )}
    </div>
  );
}

function TransactionDocumentModal({
  row,
  accessToken,
  canUploadDocuments,
  onClose,
}: {
  row: Row;
  accessToken: string;
  canUploadDocuments: boolean;
  onClose: () => void;
}) {
  const [purchase, setPurchase] = useState<PurchaseResponse | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [allocations, setAllocations] = useState<PaymentAllocationDetailResponse[]>([]);
  const isPurchase = row.documentType === "Purchase";
  const isPayment = row.documentType === "ResidentPayment" || row.documentType === "VendorPayment";
  const [loading, setLoading] = useState(isPurchase || isPayment);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (isPurchase) {
      getPurchase(accessToken, row.referenceId)
        .then((result) => { if (active) setPurchase(result); })
        .catch((err) => { if (active) setError(errorMessage(err)); })
        .finally(() => { if (active) setLoading(false); });
    } else if (isPayment) {
      Promise.all([
        getPayment(accessToken, row.referenceId),
        getPaymentAllocations(accessToken, row.referenceId).catch(() => []),
      ])
        .then(([paymentResult, allocationRows]) => {
          if (!active) return;
          setPayment(paymentResult);
          setAllocations(allocationRows);
        })
        .catch((err) => { if (active) setError(errorMessage(err)); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [accessToken, isPayment, isPurchase, row.referenceId]);

  useEffect(() => () => {
    if (receiptUrl) URL.revokeObjectURL(receiptUrl);
  }, [receiptUrl]);

  async function openReceiptPreview() {
    if (!isPayment) return;
    setReceiptLoading(true);
    setError(null);
    try {
      const file = await exportPaymentReceipt(accessToken, row.referenceId);
      setReceiptUrl(URL.createObjectURL(file.blob));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReceiptLoading(false);
    }
  }

  const fileTarget = isPayment
    ? { paymentId: row.referenceId }
    : isPurchase
      ? { purchaseId: row.referenceId }
      : { transactionId: row.id };

  return (
    <Modal
      title={isPurchase ? "Satınalma qaiməsi" : row.documentType === "VendorPayment" ? "Tədarükçü ödənişi" : isPayment ? "Sakin ödənişi" : "Tranzaksiya sənədi"}
      onClose={onClose}
      wide
    >
      <div className="transaction-document-modal">
        {!isPurchase && !isPayment && (
          <section className="data-table-wrap purchase-detail-card">
            <h3>Tranzaksiya məlumatı</h3>
            <dl className="purchase-meta">
              <div><dt>Tarix</dt><dd>{formatDateTime(row.date)}</dd></div>
              <div><dt>Növ</dt><dd>{TRANSACTION_DIRECTION_LABELS[row.direction]}</dd></div>
              <div><dt>Kateqoriya</dt><dd>{row.category}</dd></div>
              <div><dt>Məbləğ</dt><dd className={row.amount < 0 ? "ledger-value-out" : "ledger-value-in"}>{formatSigned(row.amount)}</dd></div>
              <div className="transaction-document-description"><dt>Açıqlama</dt><dd>{row.note || "—"}</dd></div>
            </dl>
          </section>
        )}

        {loading && <p className="panel-page-lead">Əlaqəli sənəd yüklənir…</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {purchase && (
          <section className="data-table-wrap purchase-lines">
            <div className="transaction-document-heading">
              <h3>Satınalma qaiməsi {purchase.invoiceNumber ?? ""}</h3>
              <Link className="panel-btn panel-btn-sm" href={`/panel/maliyye-emeliyyatlari/salinmalar/${purchase.id}`}>Satınalma detalı</Link>
            </div>
            <dl className="purchase-meta">
              <div><dt>Tədarükçü</dt><dd><Link className="owner-link" href={`/panel/tedarukculer/${purchase.vendorId}`}>{purchase.vendorName ?? "Tədarükçü"}</Link></dd></div>
              <div><dt>Tarix</dt><dd>{formatDateTime(purchase.purchaseDate)}</dd></div>
              <div><dt>Status</dt><dd>{purchaseStatusLabel(purchase.status)}</dd></div>
              <div><dt>Yekun</dt><dd>{formatMoney(purchase.totalAmount)}</dd></div>
              {purchase.note && <div className="transaction-document-description"><dt>Qeyd</dt><dd>{purchase.note}</dd></div>}
            </dl>
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead><tr><th>Nomenklatura</th><th className="vendor-th-amount">Miqdar</th><th className="vendor-th-amount">Vahid qiymət</th><th className="vendor-th-amount">Məbləğ</th></tr></thead>
                <tbody>{purchase.lines?.map((line) => (
                  <tr key={line.id}>
                    <td><Link className="owner-link" href={`/panel/inventar/materiallar/${line.nomenclatureId}`}>{line.nomenclatureName ?? line.nomenclatureCode ?? "Nomenklatura"}</Link></td>
                    <td className="vendor-amount">{line.quantity}</td>
                    <td className="vendor-amount">{formatMoney(line.unitPrice)}</td>
                    <td className="vendor-amount">{formatMoney(line.lineTotal)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}

        {payment && (
          <section className="data-table-wrap purchase-detail-card">
            <h3>{row.documentType === "VendorPayment" ? "Tədarükçü ödənişi" : "Sakin ödənişi"}</h3>
            <dl className="purchase-meta">
              <div><dt>Ödəyən</dt><dd>{payment.partyName ?? "—"}</dd></div>
              <div><dt>Əlaqəli əmlak</dt><dd>{payment.propertyLabel ?? "Ümumi ödəniş"}</dd></div>
              <div><dt>Tarix</dt><dd>{formatDateTime(payment.paymentDate)}</dd></div>
              <div><dt>Ödəniş üsulu</dt><dd>{PAYMENT_METHOD_LABELS[paymentMethodFromOrdinal(payment.paymentMethod)]}</dd></div>
              <div><dt>Status</dt><dd>{paymentStatusFromOrdinal(payment.status) === "Completed" ? "Tamamlanıb" : "Gözləyir"}</dd></div>
              <div><dt>Məbləğ</dt><dd>{formatMoney(payment.amount)}</dd></div>
              {payment.notes && <div className="transaction-document-description"><dt>Qeyd</dt><dd>{payment.notes}</dd></div>}
            </dl>
            {allocations.length > 0 && (
              <div className="owner-table-scroll">
                <table className="data-table">
                  <thead><tr><th>Əmlak</th><th>Dövr</th><th>Haqq</th><th className="vendor-th-amount">Ödənilən</th></tr></thead>
                  <tbody>{allocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td>{allocation.propertyLabel ?? "—"}</td>
                      <td>{allocation.period ?? "—"}</td>
                      <td>{allocation.description ?? "Aylıq haqq"}</td>
                      <td className="vendor-amount">{formatMoney(allocation.allocatedAmount)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {canUploadDocuments && (receiptUrl ? (
              <iframe className="transaction-receipt-preview" src={receiptUrl} title="Ödəniş qəbzi" />
            ) : (
              <button type="button" className="panel-btn panel-btn-sm" disabled={receiptLoading} onClick={openReceiptPreview}>
                {receiptLoading ? "Qəbz açılır…" : "Qəbzə bax"}
              </button>
            ))}
          </section>
        )}

        <section className="data-table-wrap purchase-detail-card transaction-files-card">
          <SignedDocumentsPanel accessToken={accessToken} target={fileTarget} canUpload={canUploadDocuments} />
        </section>
      </div>
    </Modal>
  );
}
