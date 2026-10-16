"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError, saveBlobAsFile } from "../../../lib/api/client";
import {
  createSalaryPayment,
  deleteSalaryPayment,
  exportSalaryPaymentPdf,
  getSalaryCalculationPreview,
  PAYMENT_METHOD_LABELS,
  paySalaryPayment,
  salaryPaymentStatusLabel,
  searchSalaryPayments,
  type CreateSalaryPaymentRequest,
  type PaymentMethodKey,
  type SalaryCalculationPreviewResponse,
  type SalaryPaymentResponse,
} from "../../../lib/api/payments";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

const money = (amount: number) =>
  `${amount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

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

type Employee = { id: string; fullName: string; baseSalary: number };

export function EmekHaqqiView() {
  const auth = useAuth();
  const now = new Date();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [preview, setPreview] = useState<SalaryCalculationPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("BankTransfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const [payments, setPayments] = useState<SalaryPaymentResponse[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    setLoadingEmployees(true);
    fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${auth.accessToken}` } })
      .then((res) => res.json())
      .then((data: { data: Array<{ id: string; fullName: string; baseSalary: number }> }) => {
        setEmployees(data.data.filter((e) => e.baseSalary > 0));
        setLoadingEmployees(false);
      })
      .catch(() => {
        setError("İşçi siyahısı yüklənə bilmədi");
        setLoadingEmployees(false);
      });
  }, [auth]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    loadPayments();
  }, [auth]);

  function loadPayments() {
    if (auth.status !== "authenticated") return;
    setLoadingPayments(true);
    searchSalaryPayments(auth.accessToken, { pageSize: 100 })
      .then((result) => {
        setPayments(result.salaryPayments);
        setError(null);
      })
      .catch((err) => setError(parseApiError(err).message))
      .finally(() => setLoadingPayments(false));
  }

  async function handlePreview() {
    if (!selectedEmployeeId) {
      setError("İşçi seçin");
      return;
    }
    if (auth.status !== "authenticated") return;
    setLoadingPreview(true);
    setError(null);
    try {
      const result = await getSalaryCalculationPreview(
        auth.accessToken,
        selectedEmployeeId,
        selectedYear,
        selectedMonth
      );
      setPreview(result);
      setShowPreview(true);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleCreate() {
    if (!selectedEmployeeId || !preview) return;
    if (auth.status !== "authenticated") return;
    setCreating(true);
    setError(null);
    try {
      const request: CreateSalaryPaymentRequest = {
        employeeId: selectedEmployeeId,
        salaryMonth: selectedMonth,
        salaryYear: selectedYear,
        paymentMethod,
        paymentDate,
        notes: notes || null,
      };
      await createSalaryPayment(auth.accessToken, request);
      setShowPreview(false);
      setPreview(null);
      setNotes("");
      loadPayments();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setCreating(false);
    }
  }

  async function handlePay(paymentId: string) {
    if (auth.status !== "authenticated") return;
    if (!window.confirm("Ödənişi təsdiqləyirsiniz?")) return;
    setPaying(paymentId);
    setError(null);
    try {
      await paySalaryPayment(auth.accessToken, paymentId);
      loadPayments();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setPaying(null);
    }
  }

  async function handleExport(paymentId: string) {
    if (auth.status !== "authenticated") return;
    setExporting(paymentId);
    setError(null);
    try {
      await download(exportSalaryPaymentPdf(auth.accessToken, paymentId));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleDelete(paymentId: string) {
    if (auth.status !== "authenticated") return;
    if (!window.confirm("Ödənişi silmək istədiyinizə əminsiniz?")) return;
    setDeleting(paymentId);
    setError(null);
    try {
      await deleteSalaryPayment(auth.accessToken, paymentId);
      loadPayments();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setDeleting(null);
    }
  }

  if (auth.status !== "authenticated") return null;

  return (
    <div className="panel-page">
      <div className="panel-toolbar">
        <div style={{ flex: 1 }}>
          <h1>Əmək haqqı ödənişləri</h1>
          <p className="panel-page-lead">
            Hər işçi üçün ayrıca maaş ödənişi yaradın. Bonus və düzəlişlər HR-dan avtomatik hesablanır.
          </p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="panel-section">
        <h3>Yeni ödəniş yarat</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="employee">İşçi</label>
            <select
              id="employee"
              value={selectedEmployeeId || ""}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value || null);
                setShowPreview(false);
                setPreview(null);
              }}
              disabled={loadingEmployees}
            >
              <option value="">Seçin...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — {money(e.baseSalary)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="month">Ay</label>
            <select id="month" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="year">İl</label>
            <input
              id="year"
              type="number"
              min={2000}
              max={2100}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button
              type="button"
              className="panel-btn panel-btn-primary"
              onClick={handlePreview}
              disabled={!selectedEmployeeId || loadingPreview}
            >
              {loadingPreview ? "Yüklənir..." : "Hesabla"}
            </button>
          </div>
        </div>

        {showPreview && preview && (
          <div className="panel-section" style={{ marginTop: 16, background: "#f9fafb", padding: 16, borderRadius: 4 }}>
            <h4>
              {preview.employeeFullName} — {MONTHS[selectedMonth - 1]} {selectedYear}
            </h4>
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Əsas maaş:</strong> {money(preview.baseSalary)}
              </p>
              {preview.bonuses.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Bonuslar:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {preview.bonuses.map((b, i) => (
                      <li key={i}>
                        {b.description} — {money(b.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.adjustments.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Düzəlişlər:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {preview.adjustments.map((a, i) => (
                      <li key={i}>
                        {a.description} — {money(a.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p style={{ marginTop: 12, fontSize: 18 }}>
                <strong>Toplam:</strong> {money(preview.totalGross)}
              </p>
            </div>

            <div className="form-row" style={{ marginTop: 16 }}>
              <div className="form-field">
                <label htmlFor="paymentMethod">Ödəniş üsulu</label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKey)}
                >
                  <option value="BankTransfer">Bank köçürməsi</option>
                  <option value="Cash">Nağd</option>
                  <option value="Card">Kart</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="paymentDate">Ödəniş tarixi</label>
                <input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="notes">Qeyd</label>
                <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="panel-btn panel-btn-primary"
                onClick={handleCreate}
                disabled={creating}
                style={{ marginRight: 8 }}
              >
                {creating ? "Yaradılır..." : "Ödəniş yarat"}
              </button>
              <button
                type="button"
                className="panel-btn"
                onClick={() => {
                  setShowPreview(false);
                  setPreview(null);
                }}
              >
                Ləğv et
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="panel-section" style={{ marginTop: 32 }}>
        <h3>Maaş ödənişləri ({payments.length})</h3>
        {loadingPayments ? (
          <p>Yüklənir...</p>
        ) : payments.length === 0 ? (
          <p className="panel-page-lead">Hələ heç bir ödəniş yaradılmayıb</p>
        ) : (
          <div className="data-table-wrap">
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>İşçi</th>
                    <th>Dövr</th>
                    <th>Ödəniş tarixi</th>
                    <th>Ödəniş üsulu</th>
                    <th>Məbləğ</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map((p) => {
                      const isDraft = p.status === 1;
                      const methodKey = p.paymentMethod === 0 ? "Cash" : p.paymentMethod === 1 ? "BankTransfer" : "Card";
                      return (
                        <tr key={p.id}>
                          <td>{p.employeeFullName}</td>
                          <td>
                            {MONTHS[p.salaryMonth - 1]} {p.salaryYear}
                          </td>
                          <td>{p.paymentDate.slice(0, 10)}</td>
                          <td>{PAYMENT_METHOD_LABELS[methodKey]}</td>
                          <td>
                            <strong>{money(p.grossSalary)}</strong>
                          </td>
                          <td>
                            <span
                              className={`panel-role-tag ${isDraft ? "" : "panel-role-tag-good"}`}
                            >
                              {salaryPaymentStatusLabel(p.status)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4 }}>
                              {isDraft && (
                                <>
                                  <button
                                    type="button"
                                    className="panel-btn panel-btn-sm panel-btn-primary"
                                    onClick={() => handlePay(p.id)}
                                    disabled={paying === p.id}
                                  >
                                    {paying === p.id ? "..." : "Ödə"}
                                  </button>
                                  <button
                                    type="button"
                                    className="panel-btn panel-btn-sm panel-btn-danger"
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deleting === p.id}
                                  >
                                    {deleting === p.id ? "..." : "Sil"}
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="panel-btn panel-btn-sm"
                                onClick={() => handleExport(p.id)}
                                disabled={exporting === p.id}
                              >
                                {exporting === p.id ? "..." : "PDF"}
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
        )}
      </div>
    </div>
  );
}