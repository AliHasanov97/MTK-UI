"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError, saveBlobAsFile } from "../../../lib/api/client";
import {
  calculatePayrollRun,
  getPayrollRunByPeriod,
  approvePayrollRun,
  recalculatePayrollRun,
  payPayslip,
  payAllPayslips,
  exportPayrollRunPdf,
  exportPayslipPdf,
  PAYMENT_METHOD_LABELS,
  payrollRunStatusLabel,
  type PaymentMethodKey,
  type PayrollRunResponse,
} from "../../../lib/api/payments";
import { DateInput } from "../../../components/DateInput";

const MONTHS = [
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

const money = (amount: number) =>
  `${amount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

// Gələn ayın əmək haqqı hələ hesablanmır — ay bitdikdən sonra hesablanır. Ona görə hesablama
// üçün icazəli (və səhifənin default) dövr keçmiş təqvim ayıdır (backend də eyni qaydaya tabedir).
function previousCalendarMonth(now: Date) {
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: previous.getFullYear(), month: previous.getMonth() + 1 };
}

function parseApiError(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return { message: "Bu əməliyyat üçün icazəniz yoxdur." };
    try {
      const body = JSON.parse(err.message) as { error?: string; code?: string };
      if (body.error) return { message: body.error, code: body.code };
    } catch {
      /* ignore */
    }
    return { message: `Backend xətası (${err.status}): ${err.message}` };
  }
  return { message: "Backend-ə qoşulmaq mümkün olmadı." };
}

async function download(promise: Promise<{ blob: Blob; fileName: string }>) {
  const { blob, fileName } = await promise;
  saveBlobAsFile(blob, fileName);
}

export function EmekHaqqiView() {
  const auth = useAuth();
  const now = new Date();

  const allowedPeriod = previousCalendarMonth(now);

  const [selectedYear, setSelectedYear] = useState(allowedPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(allowedPeriod.month);

  const [payrollRun, setPayrollRun] = useState<PayrollRunResponse | null>(null);
  // Dövr dəyişəndə yükləmə vəziyyətini handler-lər qaldırır — effect yalnız sorğunu işə salır.
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [payingAll, setPayingAll] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [payingSlipId, setPayingSlipId] = useState<string | null>(null);
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);
  const [exportingSlipId, setExportingSlipId] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("BankTransfer");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    // Dövr sürətlə dəyişdirilsə, köhnə sorğunun cavabı yeni dövrün məlumatını əzmasin.
    let cancelled = false;
    getPayrollRunByPeriod(auth.accessToken, selectedYear, selectedMonth)
      .then((run) => {
        if (cancelled) return;
        setPayrollRun(run);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        const apiErr = parseApiError(err);
        if (apiErr.code === "PayrollRun.NotFound") {
          setPayrollRun(null);
        } else {
          setError(apiErr.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth, selectedYear, selectedMonth]);

  async function handleCalculate() {
    if (auth.status !== "authenticated") return;
    setCalculating(true);
    setError(null);
    try {
      const run = await calculatePayrollRun(auth.accessToken, { year: selectedYear, month: selectedMonth });
      setPayrollRun(run);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setCalculating(false);
    }
  }

  async function handleApprove() {
    if (!payrollRun || auth.status !== "authenticated") return;
    if (!window.confirm("Əmək haqqı hesablamasını təsdiqləyirsiniz?")) return;
    setApproving(true);
    setError(null);
    try {
      const updated = await approvePayrollRun(auth.accessToken, payrollRun.id);
      setPayrollRun(updated);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setApproving(false);
    }
  }

  async function handlePayAll() {
    if (!payrollRun || auth.status !== "authenticated") return;
    if (!window.confirm("Bütün əmək haqqlarını ödənilmiş qeyd edirsiniz?")) return;
    setPayingAll(true);
    setError(null);
    try {
      const updated = await payAllPayslips(auth.accessToken, payrollRun.id, paymentMethod);
      setPayrollRun(updated);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setPayingAll(false);
    }
  }

  async function handleRecalculate() {
    if (!payrollRun || auth.status !== "authenticated") return;
    if (
      !window.confirm(
        "Hesablama yenidən qurulacaq və sonradan əlavə olunan bonus/düzəlişlər nəzərə alınacaq. Davam edilsin?",
      )
    )
      return;
    setRecalculating(true);
    setError(null);
    try {
      const updated = await recalculatePayrollRun(auth.accessToken, payrollRun.id);
      setPayrollRun(updated);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setRecalculating(false);
    }
  }

  async function handlePaySlip(employeeId: string) {
    if (!payrollRun || auth.status !== "authenticated") return;
    if (!window.confirm("Bu işçinin əmək haqqını ödənilmiş qeyd edirsiniz?")) return;
    setPayingSlipId(employeeId);
    setError(null);
    try {
      const updated = await payPayslip(auth.accessToken, payrollRun.id, employeeId, paymentMethod);
      setPayrollRun(updated);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setPayingSlipId(null);
    }
  }

  async function handleExportRun() {
    if (!payrollRun || auth.status !== "authenticated") return;
    setExportingRunId(payrollRun.id);
    setError(null);
    try {
      await download(exportPayrollRunPdf(auth.accessToken, payrollRun.id));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setExportingRunId(null);
    }
  }

  async function handleExportSlip(employeeId: string) {
    if (!payrollRun || auth.status !== "authenticated") return;
    setExportingSlipId(employeeId);
    setError(null);
    try {
      await download(exportPayslipPdf(auth.accessToken, payrollRun.id, employeeId));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setExportingSlipId(null);
    }
  }

  if (auth.status !== "authenticated") return null;

  // Status değerləri: Draft=1, Calculated=2, Approved=3, Paid=4
  const isCalculated = payrollRun && payrollRun.status >= 2;
  const isApproved = payrollRun && payrollRun.status >= 3;
  const isPaid = payrollRun && payrollRun.status === 4;

  // Yalnız bitmiş (keçmiş təqvim) ay üçün YENİ hesablama yaradıla bilər; köhnə aylara baxmaq
  // (tarixçə) sərbəstdir, yeni hesablama isə backend-də də bağlıdır.
  const isAllowedPeriod = selectedYear === allowedPeriod.year && selectedMonth === allowedPeriod.month;
  const hasPayments = payrollRun?.payslips.some((slip) => slip.paidAt !== null) ?? false;

  const periodValue = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  function shiftMonth(delta: number) {
    const shifted = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setLoading(true);
    setSelectedYear(shifted.getFullYear());
    setSelectedMonth(shifted.getMonth() + 1);
  }

  return (
    <div className="panel-page">
      <div className="panel-page-head">
        <div>
          <h1>Əmək haqqı</h1>
          <p className="panel-page-lead">
            Aylıq əmək haqqını bütün işçilər üçün hesablayın. Bonus və düzəlişlər HR-dan avtomatik əlavə olunur.
          </p>
        </div>
        <div className="emek-period-block">
          <div className="emek-period-nav">
            <button
              type="button"
              className="emek-period-arrow"
              onClick={() => shiftMonth(-1)}
              aria-label="Əvvəlki ay"
              disabled={loading || calculating}
            >
              ‹
            </button>
            <DateInput mode="month"
              className="emek-period-input"
              aria-label="Dövr"
              value={periodValue}
              disabled={loading || calculating}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                if (y && m) {
                  setLoading(true);
                  setSelectedYear(y);
                  setSelectedMonth(m);
                }
              }}
            />
            <button
              type="button"
              className="emek-period-arrow"
              onClick={() => shiftMonth(1)}
              aria-label="Növbəti ay"
              disabled={loading || calculating}
            >
              ›
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-primary"
              onClick={handleCalculate}
              disabled={loading || calculating || Boolean(isCalculated) || !isAllowedPeriod}
            >
              {calculating ? "Hesablanır..." : isCalculated ? "Hesablanıb" : isAllowedPeriod ? "Hesabla" : "Bağlıdır"}
            </button>
          </div>
          <p className="emek-period-note">
            Əmək haqqı ay bitdikdən sonra hesablanır — indi yalnız{" "}
            <strong>
              {MONTHS[allowedPeriod.month - 1]} {allowedPeriod.year}
            </strong>{" "}
            üçün yeni hesablama yaradıla bilər. Köhnə aylara baxmaq mümkündür.
          </p>
        </div>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div aria-hidden="true">
          <div className="emek-skeleton" />
          <div className="emek-skeleton" />
        </div>
      )}

      {!loading && !payrollRun && (
        <div className="emek-empty">
          <strong>
            {MONTHS[selectedMonth - 1]} {selectedYear} üçün əmək haqqı hesablanmayıb
          </strong>
          <span>
            {isAllowedPeriod
              ? "«Hesabla» düyməsinə basın — əmək haqqı bütün işçilər üçün avtomatik hesablanacaq."
              : `Bu dövr üçün yeni hesablama yaradıla bilməz. Hesablamaq üçün ${MONTHS[allowedPeriod.month - 1]} ${allowedPeriod.year} dövrünü seçin.`}
          </span>
        </div>
      )}

      {!loading && payrollRun && (
        <>
          <div className="emek-stats">
            <div className="emek-stat emek-stat-gross">
              <span className="emek-stat-label">Gross cəmi</span>
              <strong>{money(payrollRun.totalGross)}</strong>
              <span className="emek-stat-caption">Baza maaş + bonus + düzəlişlər</span>
            </div>
            <div className="emek-stat emek-stat-net">
              <span className="emek-stat-label">Net cəmi</span>
              <strong>{money(payrollRun.totalNet)}</strong>
              <span className="emek-stat-caption">Vergi və ayırmalardan sonra ödəniləcək</span>
            </div>
            <div className="emek-stat emek-stat-cost">
              <span className="emek-stat-label">İşəgötürən xərci</span>
              <strong>{money(payrollRun.totalEmployerCost)}</strong>
              <span className="emek-stat-caption">Net məbləğ + işəgötürən vergi və ayırmaları</span>
            </div>
            <div className="emek-stat emek-stat-count">
              <span className="emek-stat-label">İşçi sayı</span>
              <strong>{payrollRun.payslips.length}</strong>
              <span className="emek-stat-caption">
                {MONTHS[payrollRun.month - 1]} {payrollRun.year} dövrü
              </span>
            </div>
          </div>

          <section className="data-table-wrap">
            <div className="ledger-table-head">
              <h3>İşçilər</h3>
              <div className="emek-run-actions">
                <span className="ledger-count">{payrollRun.payslips.length}</span>
                <span className={`panel-role-tag ${isApproved ? "panel-role-tag-good" : ""}`}>
                  {payrollRunStatusLabel(payrollRun.status)}
                </span>
                {!isApproved && (
                  <button
                    type="button"
                    className="panel-btn panel-btn-primary"
                    onClick={handleApprove}
                    disabled={approving}
                  >
                    {approving ? "Təsdiq edilir..." : "Təsdiqlə"}
                  </button>
                )}
                {isApproved && !isPaid && (
                  <>
                    <select
                      className="panel-select"
                      aria-label="Ödəniş üsulu"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKey)}
                    >
                      <option value="BankTransfer">Bank köçürməsi</option>
                      <option value="Cash">Nağd</option>
                      <option value="Card">Kart</option>
                    </select>
                    <button
                      type="button"
                      className="panel-btn panel-btn-primary"
                      onClick={handlePayAll}
                      disabled={payingAll}
                    >
                      {payingAll ? "Ödənilir..." : "Hamısını ödə"}
                    </button>
                  </>
                )}
                {!hasPayments && (
                  <button
                    type="button"
                    className="panel-btn"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    title="Sonradan əlavə olunan bonus/düzəlişləri də daxil etmək üçün hesablamanı yenidən qurur"
                  >
                    {recalculating ? "Hesablanır..." : "Yenidən hesabla"}
                  </button>
                )}
                <button
                  type="button"
                  className="panel-btn"
                  onClick={handleExportRun}
                  disabled={exportingRunId === payrollRun.id}
                >
                  {exportingRunId === payrollRun.id ? "Export edilir..." : "PDF (Hamısı)"}
                </button>
              </div>
            </div>
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>İşçi</th>
                    <th className="emek-amount">Əsas maaş</th>
                    <th className="emek-amount">Bonus</th>
                    <th className="emek-amount">Düzəliş</th>
                    <th className="emek-amount">Gross</th>
                    <th className="emek-amount">Net</th>
                    <th>Ödəniş</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRun.payslips.map((slip) => {
                    const isPaidSlip = slip.paidAt !== null;
                    const methodKey =
                      slip.paymentMethod === 0 ? "Cash" : slip.paymentMethod === 1 ? "BankTransfer" : "Card";
                    return (
                      <tr key={slip.employeeId}>
                        <td>{slip.employeeFullName}</td>
                        <td className="emek-amount">{money(slip.baseSalary)}</td>
                        <td className="emek-amount">{slip.bonusAmount > 0 ? money(slip.bonusAmount) : "—"}</td>
                        <td className="emek-amount">
                          {slip.adjustmentAmount !== 0 ? money(slip.adjustmentAmount) : "—"}
                        </td>
                        <td className="emek-amount">{money(slip.grossSalary)}</td>
                        <td className="emek-amount emek-amount-net">{money(slip.finalNetSalary)}</td>
                        <td>
                          {isPaidSlip ? (
                            <span className="panel-role-tag panel-role-tag-good">
                              Ödənilib {slip.paymentMethod !== null && `(${PAYMENT_METHOD_LABELS[methodKey]})`}
                            </span>
                          ) : (
                            <span className="panel-role-tag">Ödənilməyib</span>
                          )}
                        </td>
                        <td>
                          <div className="emek-row-actions">
                            {isApproved && !isPaidSlip && (
                              <button
                                type="button"
                                className="panel-btn panel-btn-sm panel-btn-primary"
                                onClick={() => handlePaySlip(slip.employeeId)}
                                disabled={payingSlipId === slip.employeeId}
                              >
                                {payingSlipId === slip.employeeId ? "..." : "Ödə"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm"
                              onClick={() => handleExportSlip(slip.employeeId)}
                              disabled={exportingSlipId === slip.employeeId}
                            >
                              {exportingSlipId === slip.employeeId ? "..." : "PDF"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}