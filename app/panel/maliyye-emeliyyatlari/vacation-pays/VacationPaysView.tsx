"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError } from "../../../lib/api/client";
import {
  searchVacationPays,
  payVacationPay,
  vacationPayStatusLabel,
  paymentMethodLabel,
  type VacationPayResponse,
  type PaymentMethodKey,
  PAYMENT_METHOD_LABELS,
  type SearchVacationPaysResult,
} from "../../../lib/api/payments";
import { QueryComparisonType } from "../../../lib/api/buildings";
import { Modal } from "../../Modal";
import { DateInput } from "../../../components/DateInput";

const PAGE_SIZE = 20;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur.";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPeriod(startDate: string, endDate: string): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} - ${end}`;
}

function isOverdue(dueDate: string, status: number): boolean {
  if (status !== 1) return false; // Only Pending can be overdue
  const due = new Date(dueDate);
  const now = new Date();
  return due < now;
}

function PayVacationPayModal({
  vacationPay,
  onClose,
  onPaid,
}: {
  vacationPay: VacationPayResponse;
  onClose: () => void;
  onPaid: () => void;
}) {
  const auth = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("BankTransfer");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (auth.status !== "authenticated") return;
    setPaying(true);
    setError(null);
    try {
      await payVacationPay(auth.accessToken, vacationPay.id, paymentMethod);
      onPaid();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal title="Məzuniyyət haqqını ödə" onClose={onClose}>
      <div style={{ padding: "0 24px 24px" }}>
        {error && <p className="form-error">{error}</p>}

        <div style={{ marginBottom: 16 }}>
          <p>
            <strong>İşçi:</strong> {vacationPay.employeeFullName}
          </p>
          <p>
            <strong>Dövr:</strong> {formatPeriod(vacationPay.vacationStartDate, vacationPay.vacationEndDate)}
          </p>
          <p>
            <strong>Günlər:</strong> {vacationPay.vacationDays}
          </p>
          <p>
            <strong>Məbləğ:</strong> {vacationPay.totalAmount.toFixed(2)} ₼
          </p>
          <p>
            <strong>Son ödəmə tarixi:</strong> {formatDate(vacationPay.dueDate)}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="payment-method">Ödəniş üsulu</label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKey)}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose} disabled={paying}>
            Ləğv et
          </button>
          <button type="button" className="panel-btn panel-btn-primary" onClick={handlePay} disabled={paying}>
            {paying ? "Ödənilir…" : "Ödə"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function VacationPaysView() {
  const auth = useAuth();
  const [result, setResult] = useState<SearchVacationPaysResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState<number[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [payingVacationPay, setPayingVacationPay] = useState<VacationPayResponse | null>(null);

  // Reset to page 1 when filters change
  const filterSignature = JSON.stringify([filterStatus, filterEmployee, filterDateFrom, filterDateTo]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    const filters = [];
    if (filterStatus.length > 0) {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.In, value: filterStatus });
    }
    if (filterEmployee.trim()) {
      filters.push({
        columnName: "EmployeeFullName",
        comparison: QueryComparisonType.Contains,
        value: filterEmployee.trim(),
      });
    }
    if (filterDateFrom) {
      filters.push({
        columnName: "DueDate",
        comparison: QueryComparisonType.GreaterThanOrEqual,
        value: filterDateFrom,
      });
    }
    if (filterDateTo) {
      filters.push({
        columnName: "DueDate",
        comparison: QueryComparisonType.LessThanOrEqual,
        value: filterDateTo,
      });
    }

    searchVacationPays(auth.accessToken, {
      filters: filters.length > 0 ? filters : null,
      sortCriteria: { columnName: "DueDate", direction: 0 }, // Ascending (earliest first)
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setResult(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, filterStatus, filterEmployee, filterDateFrom, filterDateTo, pageNumber]);

  if (auth.status !== "authenticated") return null;

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  const activeFilterCount = [filterStatus, filterEmployee, filterDateFrom, filterDateTo].filter(
    (f) => (Array.isArray(f) ? f.length > 0 : !!f)
  ).length;

  function handlePaid() {
    setPayingVacationPay(null);
    // Refresh the list
    setPageNumber(pageNumber); // Trigger re-fetch
  }

  return (
    <div>
      {/* TOOLBAR */}
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="İşçi adı..."
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
        />
        <select
          value={filterStatus.length === 1 ? filterStatus[0] : ""}
          onChange={(e) => {
            const val = e.target.value;
            setFilterStatus(val ? [Number(val)] : []);
          }}
        >
          <option value="">Bütün statuslar</option>
          <option value="1">Gözləyir</option>
          <option value="2">Ödənilib</option>
        </select>
        <DateInput value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        <DateInput value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        {activeFilterCount > 0 && (
          <button
            type="button"
            className="panel-btn panel-btn-sm"
            onClick={() => {
              setFilterStatus([]);
              setFilterEmployee("");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
          >
            Filtrləri təmizlə ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {/* LOADING STATE */}
      {!result ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <>
          {/* TABLE */}
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>İşçi</th>
                  <th>Məzuniyyət dövrü</th>
                  <th>Günlər</th>
                  <th>Orta aylıq</th>
                  <th>Orta günlük</th>
                  <th>Məbləğ</th>
                  <th>Son ödəmə</th>
                  <th>Status</th>
                  <th>Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {result.vacationPays.length === 0 && (
                  <tr>
                    <td colSpan={9}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {result.vacationPays.map((vp) => {
                  const overdue = isOverdue(vp.dueDate, vp.status);
                  return (
                    <tr key={vp.id} style={overdue ? { backgroundColor: "#ffebee" } : undefined}>
                      <td>{vp.employeeFullName}</td>
                      <td>{formatPeriod(vp.vacationStartDate, vp.vacationEndDate)}</td>
                      <td>{vp.vacationDays}</td>
                      <td>{vp.averageMonthlyWage.toFixed(2)} ₼</td>
                      <td>{vp.averageDailyWage.toFixed(2)} ₼</td>
                      <td>
                        <strong>{vp.totalAmount.toFixed(2)} ₼</strong>
                      </td>
                      <td>
                        {formatDate(vp.dueDate)}
                        {overdue && (
                          <span style={{ color: "#c62828", marginLeft: 8, fontSize: "0.9em" }}>
                            (vaxtı keçib)
                          </span>
                        )}
                      </td>
                      <td>
                        {vacationPayStatusLabel(vp.status)}
                        {vp.status === 2 && vp.paymentMethod !== null && (
                          <>
                            <br />
                            <small>{paymentMethodLabel(vp.paymentMethod)}</small>
                          </>
                        )}
                      </td>
                      <td>
                        {vp.status === 1 && (
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-primary"
                            onClick={() => setPayingVacationPay(vp)}
                          >
                            Ödə
                          </button>
                        )}
                        {vp.status === 2 && <span style={{ color: "#666" }}>✓ Ödənilib</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="panel-pagination">
            <span>
              Cəmi {result.totalCount} ödəniş — səhifə {result.page + 1}/{totalPages}
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
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          </div>
        </>
      )}

      {/* PAY MODAL */}
      {payingVacationPay && (
        <PayVacationPayModal
          vacationPay={payingVacationPay}
          onClose={() => setPayingVacationPay(null)}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
