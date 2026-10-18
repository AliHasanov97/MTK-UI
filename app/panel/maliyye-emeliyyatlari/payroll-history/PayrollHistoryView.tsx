"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError, saveBlobAsFile } from "../../../lib/api/client";
import {
  listPayrollRuns,
  recalculatePayrollRun,
  exportPayrollRunPdf,
  payrollRunStatusLabel,
  type PayrollRunListItem,
} from "../../../lib/api/payments";

const AZ_MONTHS = [
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

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur.";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function formatPeriod(year: number, month: number): string {
  return `${AZ_MONTHS[month - 1]} ${year}`;
}

export function PayrollHistoryView() {
  const auth = useAuth();
  const [runs, setRuns] = useState<PayrollRunListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  // Filters
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState<number | "">("");

  function loadData() {
    if (auth.status !== "authenticated") return;

    listPayrollRuns(auth.accessToken)
      .then((data) => {
        let filtered = data;

        // Apply filters
        if (filterYear) {
          filtered = filtered.filter((r) => r.year === Number(filterYear));
        }
        if (filterStatus !== "") {
          filtered = filtered.filter((r) => r.status === Number(filterStatus));
        }

        setRuns(filtered);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, filterYear, filterStatus]);

  async function handleRecalculate(payrollRunId: string) {
    if (auth.status !== "authenticated") return;
    setRecalculating(payrollRunId);
    setError(null);
    try {
      await recalculatePayrollRun(auth.accessToken, payrollRunId);
      loadData(); // Refresh the list
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRecalculating(null);
    }
  }

  async function handleExport(payrollRunId: string, year: number, month: number) {
    if (auth.status !== "authenticated") return;
    setExporting(payrollRunId);
    setError(null);
    try {
      const { blob, fileName } = await exportPayrollRunPdf(auth.accessToken, payrollRunId);
      saveBlobAsFile(blob, fileName || `payroll-${year}-${month}.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  if (auth.status !== "authenticated") return null;

  const activeFilterCount = [filterYear, filterStatus].filter((f) => f !== "").length;

  // Get unique years for filter
  const years = runs ? Array.from(new Set(runs.map((r) => r.year))).sort((a, b) => b - a) : [];

  return (
    <div>
      {/* TOOLBAR */}
      <div className="panel-toolbar">
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">Bütün illər</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as number | "")}>
          <option value="">Bütün statuslar</option>
          <option value="1">Qaralama</option>
          <option value="2">Hesablanıb</option>
          <option value="3">Təsdiqlənib</option>
          <option value="4">Ödənilib</option>
        </select>
        {activeFilterCount > 0 && (
          <button
            type="button"
            className="panel-btn panel-btn-sm"
            onClick={() => {
              setFilterYear("");
              setFilterStatus("");
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
      {!runs ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <>
          {/* TABLE */}
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dövr</th>
                  <th>İşçi sayı</th>
                  <th>Gross</th>
                  <th>Net (xalis)</th>
                  <th>İşəgötürən xərci</th>
                  <th>Status</th>
                  <th>Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={7}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link
                        href={`/panel/maliyye-emeliyyatlari/emek-haqqi?year=${run.year}&month=${run.month}`}
                        style={{ textDecoration: "underline", color: "#1976d2" }}
                      >
                        {formatPeriod(run.year, run.month)}
                      </Link>
                    </td>
                    <td>{run.employeeCount}</td>
                    <td>{run.totalGross.toFixed(2)} ₼</td>
                    <td>
                      <strong>{run.totalNet.toFixed(2)} ₼</strong>
                    </td>
                    <td>{run.totalEmployerCost.toFixed(2)} ₼</td>
                    <td>{payrollRunStatusLabel(run.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {run.status === 2 && (
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={recalculating === run.id}
                            onClick={() => handleRecalculate(run.id)}
                          >
                            {recalculating === run.id ? "Yenilənir…" : "Yenilə"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="panel-btn panel-btn-sm"
                          disabled={exporting === run.id}
                          onClick={() => handleExport(run.id, run.year, run.month)}
                        >
                          {exporting === run.id ? "Çıxarılır…" : "PDF"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {runs.length > 0 && (
            <div style={{ marginTop: 16, color: "#666", fontSize: "0.9em" }}>
              <p>
                <strong>Qeyd:</strong> Dövr üzərinə klikləyərək əmək haqqı hesablama səhifəsinə keçid edə bilərsiniz.
              </p>
              <p>
                <strong>Yenilə:</strong> Yalnız "Hesablanıb" statusundakı payroll-u yeniləyə bilərsiniz (bonus və
                düzəlişlər əlavə edilərsə).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
