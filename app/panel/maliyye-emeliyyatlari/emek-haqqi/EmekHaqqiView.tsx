"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError, saveBlobAsFile } from "../../../lib/api/client";
import {
  calculatePayrollRun,
  exportPayrollRun,
  exportPayslip,
  getPayrollRunByPeriod,
  payrollRunStatusLabel,
  type PayrollRunResponse,
} from "../../../lib/api/payments";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

const money = (amount: number) =>
  `${amount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

/** Backend-in {"error": "...", "code": "..."} cavabından oxunaqlı mətn və kod çıxarır. */
function parseApiError(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return { message: "Bu əməliyyat üçün icazəniz yoxdur." };
    try {
      const body = JSON.parse(err.message) as { error?: string; code?: string };
      if (body.error) return { message: body.error, code: body.code };
    } catch {
      /* mətn JSON deyil */
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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [run, setRun] = useState<PayrollRunResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getPayrollRunByPeriod(auth.accessToken, year, month)
      .then((r) => {
        setRun(r);
        setNotFound(false);
        setError(null);
      })
      .catch((err) => {
        const { message, code } = parseApiError(err);
        if (code === "PayrollRun.NotFound") {
          setNotFound(true);
          setError(null);
        } else {
          setError(message);
        }
      });
  }, [auth, year, month]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;
  const periodLabel = `${MONTHS[month - 1]} ${year}`;

  function resetForNewPeriod() {
    setRun(null);
    setNotFound(false);
    setError(null);
  }

  async function handleCalculate() {
    setCalculating(true);
    setError(null);
    try {
      setRun(await calculatePayrollRun(accessToken, year, month));
      setNotFound(false);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setCalculating(false);
    }
  }

  async function handleExportAll() {
    if (!run) return;
    setExporting("all");
    setError(null);
    try {
      await download(exportPayrollRun(accessToken, run.id));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportOne(employeeId: string) {
    if (!run) return;
    setExporting(employeeId);
    setError(null);
    try {
      await download(exportPayslip(accessToken, run.id, employeeId));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="panel-page">
      <div className="panel-toolbar">
        <div style={{ flex: 1 }}>
          <h1>Əmək haqqı</h1>
          <p className="panel-page-lead">
            Seçilmiş ay üçün bütün (HR-dan sinxronlaşmış) işçilər üzrə əmək haqqı hesablaması. Hər ay üçün hesablama
            yalnız bir dəfə aparılır.
          </p>
        </div>
      </div>

      <div className="form-row" style={{ maxWidth: 360 }}>
        <div className="form-field">
          <label htmlFor="payroll-month">Ay</label>
          <select
            id="payroll-month"
            value={month}
            onChange={(e) => {
              resetForNewPeriod();
              setMonth(Number(e.target.value));
            }}
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="payroll-year">İl</label>
          <input
            id="payroll-year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => {
              resetForNewPeriod();
              setYear(Number(e.target.value));
            }}
          />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {!run && !notFound && !error ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : !run ? (
        <div className="hr-empty">
          <strong>{periodLabel} üçün hələ hesablama aparılmayıb</strong>
          <span>Bu dövr üçün HR-dan sinxronlaşmış bütün aktiv işçilər üzrə əmək haqqını hesablayın.</span>
          <button
            type="button"
            className="panel-btn panel-btn-primary"
            style={{ marginTop: 12 }}
            disabled={calculating}
            onClick={handleCalculate}
          >
            {calculating ? "Hesablanır…" : `${periodLabel} üçün hesabla`}
          </button>
        </div>
      ) : (
        <>
          <div className="hr-profile-stats" style={{ marginTop: 16 }}>
            <div className="hr-stat">
              <span className="panel-role-tag">{payrollRunStatusLabel(run.status)}</span>
              <span>{periodLabel}</span>
            </div>
            <div className="hr-stat">
              <strong>{money(run.totalGross)}</strong>
              <span>Ümumi brutto</span>
            </div>
            <div className="hr-stat">
              <strong>{money(run.totalNet)}</strong>
              <span>Ümumi net</span>
            </div>
            <div className="hr-stat">
              <strong>{money(run.totalEmployerCost)}</strong>
              <span>İşəgötürənin ümumi xərci</span>
            </div>
          </div>

          <div className="panel-toolbar" style={{ marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>Qəbzlər ({run.payslips.length} işçi)</h3>
            </div>
            <button
              type="button"
              className="panel-btn panel-btn-primary"
              disabled={exporting === "all" || run.payslips.length === 0}
              onClick={handleExportAll}
            >
              {exporting === "all" ? "Yüklənir…" : "Bütün qəbzləri yüklə (PDF)"}
            </button>
          </div>

          <div className="data-table-wrap">
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>İşçi</th>
                    <th>Əsas maaş</th>
                    <th>Bonus</th>
                    <th>Brutto</th>
                    <th>Tutulmalar</th>
                    <th>Məhkəmə tutumu</th>
                    <th>Yekun net</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {run.payslips.map((p) => {
                    const deductions = p.employeeDsmf + p.employeeUnemployment + p.employeeMedicalInsurance + p.incomeTax;
                    return (
                      <tr key={p.employeeId}>
                        <td>{p.employeeFullName}</td>
                        <td>{money(p.baseSalary)}</td>
                        <td>{money(p.bonusAmount)}</td>
                        <td>{money(p.grossSalary)}</td>
                        <td>{money(deductions)}</td>
                        <td>{p.courtDeductionAmount > 0 ? money(p.courtDeductionAmount) : "—"}</td>
                        <td>
                          <strong>{money(p.finalNetSalary)}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={exporting === p.employeeId}
                            onClick={() => handleExportOne(p.employeeId)}
                          >
                            {exporting === p.employeeId ? "…" : "PDF"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
