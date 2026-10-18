"use client";

import { useState, useEffect } from "react";
import {
  getVacationPaysByEmployee,
  payVacationPay,
  vacationPayStatusLabel,
  getSalaryPaymentsByEmployee,
  getPayslipsByEmployee,
  payPayslip,
  exportPayslipPdf,
  payrollRunStatusLabel,
  PAYMENT_METHOD_LABELS,
  salaryPaymentStatusLabel,
  paymentMethodLabel,
  type VacationPayResponse,
  type SalaryPaymentResponse,
  type EmployeePayslipResponse,
  type PaymentMethodKey,
} from "../../../../lib/api/payments";
import { saveBlobAsFile } from "../../../../lib/api/client";
import { formatDate, hrErrorMessage } from "../../shared";
import { Modal } from "../../../Modal";

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

const periodLabel = (year: number, month: number) => `${MONTHS[month - 1] ?? month} ${year}`;

const money = (amount: number) =>
  `${amount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

type PaymentSubTab = "vacation" | "payslip";

export function PaymentsTab({
  accessToken,
  employeeId,
  employeeFullName,
}: {
  accessToken: string;
  employeeId: string;
  employeeFullName: string;
}) {
  const [subTab, setSubTab] = useState<PaymentSubTab>("payslip");

  return (
    <section className="hr-section">
      <h3 className="hr-section-title">Maaş Ödənişləri</h3>
      <p className="hr-note">
        {employeeFullName} üçün bütün maaş ödənişləri: avtomatik payroll, manual ödənişlər və məzuniyyət haqqı.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e0e0e0" }}>
        <button
          type="button"
          onClick={() => setSubTab("payslip")}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "none",
            borderBottom: subTab === "payslip" ? "2px solid #007bff" : "2px solid transparent",
            color: subTab === "payslip" ? "#007bff" : "#666",
            fontWeight: subTab === "payslip" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          Maaş Ödənişləri (Payslip)
        </button>
        <button
          type="button"
          onClick={() => setSubTab("vacation")}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "none",
            borderBottom: subTab === "vacation" ? "2px solid #007bff" : "2px solid transparent",
            color: subTab === "vacation" ? "#007bff" : "#666",
            fontWeight: subTab === "vacation" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          Məzuniyyət Ödənişləri
        </button>
      </div>

      {subTab === "payslip" && <PayslipsSubTab accessToken={accessToken} employeeId={employeeId} />}
      {subTab === "vacation" && <VacationPaysSubTab accessToken={accessToken} employeeId={employeeId} employeeFullName={employeeFullName} />}
    </section>
  );
}

/* ========== Manual Maaş Ödənişləri ========== */
function SalaryPaymentsSubTab({ accessToken, employeeId }: { accessToken: string; employeeId: string }) {
  const [salaryPayments, setSalaryPayments] = useState<SalaryPaymentResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSalaryPaymentsByEmployee(accessToken, employeeId)
      .then((payments) => {
        setSalaryPayments([...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId]);

  if (error) return <p className="form-error">{error}</p>;
  if (!salaryPayments) return <p className="panel-page-lead">Yüklənir…</p>;

  if (salaryPayments.length === 0) {
    return (
      <div className="hr-empty">
        <strong>Manual ödəniş yoxdur</strong>
        <span>İşçiyə hələ fərdi maaş ödənişi edilməyib.</span>
      </div>
    );
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tarix</th>
            <th>Dövr (Ay/İl)</th>
            <th style={{ textAlign: "right" }}>Baza maaş</th>
            <th style={{ textAlign: "right" }}>Bonuslar</th>
            <th style={{ textAlign: "right" }}>Düzəlişlər</th>
            <th style={{ textAlign: "right" }}>Ümumi məbləğ</th>
            <th style={{ textAlign: "center" }}>Ödəniş üsulu</th>
            <th style={{ textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {salaryPayments.map((payment) => (
            <tr key={payment.id}>
              <td>{formatDate(payment.paymentDate)}</td>
              <td>{payment.salaryMonth}/{payment.salaryYear}</td>
              <td style={{ textAlign: "right" }}>{money(payment.baseSalary)}</td>
              <td style={{ textAlign: "right" }}>{money(payment.totalBonuses)}</td>
              <td style={{ textAlign: "right" }}>{money(payment.totalAdjustments)}</td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>{money(payment.grossSalary)}</td>
              <td style={{ textAlign: "center" }}>{paymentMethodLabel(payment.paymentMethod)}</td>
              <td style={{ textAlign: "center" }}>
                <span
                  className={`panel-role-tag ${
                    payment.status === 2 ? "panel-role-tag-good" : ""
                  }`}
                >
                  {salaryPaymentStatusLabel(payment.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ========== Məzuniyyət Ödənişləri ========== */
function VacationPaysSubTab({
  accessToken,
  employeeId,
  employeeFullName,
}: {
  accessToken: string;
  employeeId: string;
  employeeFullName: string;
}) {
  const [vacationPays, setVacationPays] = useState<VacationPayResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPay, setSelectedPay] = useState<VacationPayResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getVacationPaysByEmployee(accessToken, employeeId)
      .then((pays) => {
        setVacationPays([...pays].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId, reloadKey]);

  if (error) return <p className="form-error">{error}</p>;
  if (!vacationPays) return <p className="panel-page-lead">Yüklənir…</p>;

  if (vacationPays.length === 0) {
    return (
      <div className="hr-empty">
        <strong>Məzuniyyət ödənişi yoxdur</strong>
        <span>İşçiyə hələ məzuniyyət əmri verilməyib və ya məzuniyyət ödənişi yaradılmayıb.</span>
      </div>
    );
  }

  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Məzuniyyət dövrü</th>
              <th style={{ textAlign: "center" }}>Günlər</th>
              <th style={{ textAlign: "center" }}>Orta aylıq</th>
              <th style={{ textAlign: "center" }}>Orta günlük</th>
              <th style={{ textAlign: "right" }}>Məbləğ</th>
              <th style={{ textAlign: "center" }}>Son ödəmə</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {vacationPays.map((pay) => {
              const isPending = pay.status === 1;
              const isPaid = pay.status === 2;
              const today = new Date();
              const dueDate = new Date(pay.dueDate);
              const isOverdue = isPending && dueDate < today;

              return (
                <tr key={pay.id}>
                  <td>
                    {formatDate(pay.vacationStartDate)} – {formatDate(pay.vacationEndDate)}
                  </td>
                  <td style={{ textAlign: "center" }}>{pay.vacationDays}</td>
                  <td style={{ textAlign: "center" }}>{money(pay.averageMonthlyWage)}</td>
                  <td style={{ textAlign: "center" }}>{money(pay.averageDailyWage)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{money(pay.totalAmount)}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: isOverdue ? "#dc3545" : "#666", fontWeight: isOverdue ? 600 : 400 }}>
                      {formatDate(pay.dueDate)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className={`panel-role-tag ${isPaid ? "panel-role-tag-good" : isOverdue ? "panel-role-tag-bad" : ""}`}
                    >
                      {vacationPayStatusLabel(pay.status)}
                      {isOverdue && " (gecikdi)"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {isPending ? (
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm panel-btn-primary"
                        onClick={() => setSelectedPay(pay)}
                      >
                        Ödə
                      </button>
                    ) : (
                      <span style={{ fontSize: 13, color: "#999" }}>
                        {pay.paidAt ? formatDate(pay.paidAt) : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedPay && (
        <PayVacationPayModal
          accessToken={accessToken}
          vacationPay={selectedPay}
          onClose={() => setSelectedPay(null)}
          onPaid={() => {
            setSelectedPay(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

/* ========== Payslip-lər (PayrollRun) ========== */
function PayslipsSubTab({ accessToken, employeeId }: { accessToken: string; employeeId: string }) {
  const [payslips, setPayslips] = useState<EmployeePayslipResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<EmployeePayslipResponse | null>(null);
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getPayslipsByEmployee(accessToken, employeeId)
      .then((slips) => {
        setPayslips(slips);
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId, reloadKey]);

  async function handleExport(slip: EmployeePayslipResponse) {
    setExportingRunId(slip.payrollRunId);
    setError(null);
    try {
      const { blob, fileName } = await exportPayslipPdf(accessToken, slip.payrollRunId, employeeId);
      saveBlobAsFile(blob, fileName);
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setExportingRunId(null);
    }
  }

  if (error) return <p className="form-error">{error}</p>;
  if (!payslips) return <p className="panel-page-lead">Yüklənir…</p>;

  if (payslips.length === 0) {
    return (
      <div className="hr-empty">
        <strong>Payslip yoxdur</strong>
        <span>Bu işçi üçün hələ əmək haqqı hesablanmayıb.</span>
      </div>
    );
  }

  return (
    <>
      <div className="data-table-wrap">
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dövr</th>
                <th style={{ textAlign: "right" }}>Baza maaş</th>
                <th style={{ textAlign: "right" }}>Bonus</th>
                <th style={{ textAlign: "right" }}>Düzəliş</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>Xalis</th>
                <th style={{ textAlign: "right" }}>İşəgötürən xərci</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((slip) => {
                const key = `${slip.payrollRunId}-${slip.year}-${slip.month}`;
                const isPaidSlip = slip.paidAt !== null;
                const canPay = !isPaidSlip && slip.payrollRunStatus === 3;

                return (
                  <tr key={key}>
                    <td>{periodLabel(slip.year, slip.month)}</td>
                    <td style={{ textAlign: "right" }}>{money(slip.baseSalary)}</td>
                    <td style={{ textAlign: "right" }}>
                      {slip.bonusAmount !== 0 ? money(slip.bonusAmount) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {slip.adjustmentAmount !== 0 ? money(slip.adjustmentAmount) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>{money(slip.grossSalary)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{money(slip.finalNetSalary)}</td>
                    <td style={{ textAlign: "right" }}>{money(slip.totalEmployerCost)}</td>
                    <td style={{ textAlign: "center" }}>
                      {isPaidSlip ? (
                        <span className="panel-role-tag panel-role-tag-good">
                          Ödənilib
                          {slip.paymentMethod !== null && ` (${paymentMethodLabel(slip.paymentMethod)})`}
                        </span>
                      ) : (
                        <span className="panel-role-tag">{payrollRunStatusLabel(slip.payrollRunStatus)}</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        {canPay && (
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-primary"
                            onClick={() => setSelectedSlip(slip)}
                          >
                            Ödə
                          </button>
                        )}
                        <button
                          type="button"
                          className="panel-btn panel-btn-sm"
                          onClick={() => handleExport(slip)}
                          disabled={exportingRunId === slip.payrollRunId}
                        >
                          {exportingRunId === slip.payrollRunId ? "..." : "PDF"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSlip && (
        <PayPayslipModal
          accessToken={accessToken}
          employeeId={employeeId}
          payslip={selectedSlip}
          onClose={() => setSelectedSlip(null)}
          onPaid={() => {
            setSelectedSlip(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

function PayPayslipModal({
  accessToken,
  employeeId,
  payslip,
  onClose,
  onPaid,
}: {
  accessToken: string;
  employeeId: string;
  payslip: EmployeePayslipResponse;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("BankTransfer");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      await payPayslip(accessToken, payslip.payrollRunId, employeeId, paymentMethod);
      onPaid();
    } catch (err) {
      setError(hrErrorMessage(err));
      setPaying(false);
    }
  }

  return (
    <Modal title="Əmək Haqqını Ödə" onClose={onClose}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <strong>{periodLabel(payslip.year, payslip.month)}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: 14 }}>
          <div>
            <span style={{ color: "#666" }}>Baza maaş:</span> <strong>{money(payslip.baseSalary)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Bonus:</span>{" "}
            <strong>{money(payslip.bonusAmount)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Düzəliş:</span>{" "}
            <strong>{money(payslip.adjustmentAmount)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Gross:</span> <strong>{money(payslip.grossSalary)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Xalis:</span>{" "}
            <strong style={{ fontSize: 16, color: "#28a745" }}>{money(payslip.finalNetSalary)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>İşəgötürən xərci:</span>{" "}
            <strong>{money(payslip.totalEmployerCost)}</strong>
          </div>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="payslip-payment-method">Ödəniş üsulu</label>
        <select
          id="payslip-payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKey)}
        >
          <option value="BankTransfer">{PAYMENT_METHOD_LABELS.BankTransfer}</option>
          <option value="Cash">{PAYMENT_METHOD_LABELS.Cash}</option>
          <option value="Card">{PAYMENT_METHOD_LABELS.Card}</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="panel-btn" onClick={onClose}>
          Ləğv et
        </button>
        <button type="button" className="panel-btn panel-btn-primary" disabled={paying} onClick={handlePay}>
          {paying ? "Ödənilir…" : "Ödəniş et"}
        </button>
      </div>
    </Modal>
  );
}

/* ========== Modal ========== */
function PayVacationPayModal({
  accessToken,
  vacationPay,
  onClose,
  onPaid,
}: {
  accessToken: string;
  vacationPay: VacationPayResponse;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("BankTransfer");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      await payVacationPay(accessToken, vacationPay.id, paymentMethod);
      onPaid();
    } catch (err) {
      setError(hrErrorMessage(err));
      setPaying(false);
    }
  }

  return (
    <Modal title="Məzuniyyət Haqqını Ödə" onClose={onClose}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <strong>{vacationPay.employeeFullName}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: 14 }}>
          <div>
            <span style={{ color: "#666" }}>Məzuniyyət:</span>{" "}
            <strong>
              {formatDate(vacationPay.vacationStartDate)} – {formatDate(vacationPay.vacationEndDate)}
            </strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Günlər:</span> <strong>{vacationPay.vacationDays}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Orta aylıq maaş:</span>{" "}
            <strong>{money(vacationPay.averageMonthlyWage)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Orta günlük:</span> <strong>{money(vacationPay.averageDailyWage)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Son ödəmə:</span> <strong>{formatDate(vacationPay.dueDate)}</strong>
          </div>
          <div>
            <span style={{ color: "#666" }}>Məbləğ:</span>{" "}
            <strong style={{ fontSize: 16, color: "#28a745" }}>{money(vacationPay.totalAmount)}</strong>
          </div>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="payment-method">Ödəniş üsulu</label>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKey)}
        >
          <option value="BankTransfer">{PAYMENT_METHOD_LABELS.BankTransfer}</option>
          <option value="Cash">{PAYMENT_METHOD_LABELS.Cash}</option>
          <option value="Card">{PAYMENT_METHOD_LABELS.Card}</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="panel-btn" onClick={onClose}>
          Ləğv et
        </button>
        <button type="button" className="panel-btn panel-btn-primary" disabled={paying} onClick={handlePay}>
          {paying ? "Ödənilir…" : "Ödəniş et"}
        </button>
      </div>
    </Modal>
  );
}