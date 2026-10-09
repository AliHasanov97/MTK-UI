"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { SortDirection } from "../../lib/api/buildings";
import {
  getCompanyBalance,
  searchTransactions,
  transactionDirectionFromOrdinal,
  type CompanyBalanceResponse,
  type TransactionResponse,
} from "../../lib/api/payments";

// One big pull, aggregated client-side — same "whole ledger" pattern as
// Tranzaksiyalar/Borclar. "Əvvəlki balans" needs the full history before the
// selected month, so the cap is generous; if the ledger ever outgrows it, a
// dedicated backend summary endpoint should replace this client-side reduction.
const FETCH_SIZE = 3000;

const AZ_MONTHS_FULL = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

// Must match Transaction.ResidentPaymentCategory on the backend — the fixed
// category a resident payment always posts under, which is what "actual
// collection this month" means (as opposed to a manually entered other income).
const RESIDENT_PAYMENT_CATEGORY = "Sakin ödənişi";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

type ExpenseRow = { id: string; category: string; description: string; amount: number };

export function UmumiHesabatView() {
  const auth = useAuth();
  const [transactions, setTransactions] = useState<TransactionResponse[] | null>(null);
  const [companyBalance, setCompanyBalance] = useState<CompanyBalanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([
      searchTransactions(auth.accessToken, {
        sortCriteria: { columnName: "TransactionDate", direction: SortDirection.Ascending },
        pageSize: FETCH_SIZE,
      }),
      getCompanyBalance(auth.accessToken),
    ])
      .then(([transactionsRes, balanceRes]) => {
        setTransactions(transactionsRes.transactions);
        setCompanyBalance(balanceRes);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  // Exclusive bounds, both in epoch ms — real instants, not strings (the backend's
  // default DateTimeOffset serialization uses "+00:00", never "Z", so a raw string
  // comparison against the two is unreliable; see Tranzaksiyalar for the same fix).
  const monthStartMs = Date.UTC(year, month - 1, 1);
  const monthEndMs = Date.UTC(year, month, 1);

  const summary = useMemo(() => {
    let collected = 0;
    let otherIncome = 0;
    let previousBalance = 0;
    const expenseRows: ExpenseRow[] = [];

    for (const t of transactions ?? []) {
      const ms = new Date(t.transactionDate).getTime();
      const direction = transactionDirectionFromOrdinal(t.direction);
      const signed = direction === "Income" ? t.amount : -t.amount;

      if (ms < monthStartMs) {
        previousBalance += signed;
        continue;
      }
      if (ms >= monthEndMs) continue;

      if (direction === "Income") {
        if (t.category === RESIDENT_PAYMENT_CATEGORY) collected += t.amount;
        else otherIncome += t.amount;
      } else {
        expenseRows.push({ id: t.id, category: t.category, description: t.description ?? "—", amount: t.amount });
      }
    }

    expenseRows.sort((a, b) => a.category.localeCompare(b.category, "az") || a.description.localeCompare(b.description, "az"));
    const totalExpense = expenseRows.reduce((sum, r) => sum + r.amount, 0);
    const monthlyIncome = collected + otherIncome;
    const monthlyBalance = previousBalance + monthlyIncome;
    const finalBalance = monthlyBalance - totalExpense;

    return { collected, otherIncome, previousBalance, expenseRows, totalExpense, monthlyIncome, monthlyBalance, finalBalance };
  }, [transactions, monthStartMs, monthEndMs]);

  if (auth.status !== "authenticated") return null;

  const loading = !transactions;

  // Rowspan groups for the category column, like a classic printed statement —
  // consecutive expense rows of the same category share one merged cell. The №
  // column merges the same way and counts groups, not lines — two rows under
  // the same category are one numbered entry, not two.
  const categoryRowSpans = new Map<number, number>();
  const categoryGroupNumbers = new Map<number, number>();
  let groupCounter = 0;
  summary.expenseRows.forEach((row, i) => {
    if (i > 0 && summary.expenseRows[i - 1].category === row.category) return;
    groupCounter += 1;
    categoryGroupNumbers.set(i, groupCounter);
    let span = 1;
    while (summary.expenseRows[i + span]?.category === row.category) span++;
    categoryRowSpans.set(i, span);
  });

  const today = new Date();
  const generatedOn = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  function shiftMonth(delta: number) {
    const shifted = new Date(year, month - 1 + delta, 1);
    setYear(shifted.getFullYear());
    setMonth(shifted.getMonth() + 1);
  }

  const periodValue = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <>
      <div className="umumi-hesabat-toolbar">
        <div className="umumi-period-nav">
          <button
            type="button"
            className="umumi-period-arrow"
            onClick={() => shiftMonth(-1)}
            aria-label="Əvvəlki ay"
          >
            ‹
          </button>
          <input
            type="month"
            className="umumi-period-input"
            value={periodValue}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              if (y && m) {
                setYear(y);
                setMonth(m);
              }
            }}
          />
          <button
            type="button"
            className="umumi-period-arrow"
            onClick={() => shiftMonth(1)}
            aria-label="Növbəti ay"
          >
            ›
          </button>
        </div>
        <div className="umumi-toolbar-right">
          {companyBalance && (
            <span className="umumi-balance-pill">
              Rəsmi balans:{" "}
              <strong className={companyBalance.currentBalance < 0 ? "vendor-value-danger" : "vendor-value-ok"}>
                {formatMoney(companyBalance.currentBalance)}
              </strong>
            </span>
          )}
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => window.print()}>
            ⎙ Çap et
          </button>
        </div>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="ledger-skeletons" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ledger-skeleton" />
          ))}
        </div>
      ) : (
        <div className="umumi-grid">
          <h2 className="umumi-grid-title">
            {AZ_MONTHS_FULL[month - 1]} ayının hesabatı ({year})
          </h2>

          <div className="owner-table-scroll">
            <table className="umumi-grid-table">
              <thead>
                <tr>
                  <th colSpan={5} className="umumi-grid-band">
                    Aylıq gəlirlər barədə hesabat (manatla)
                  </th>
                </tr>
                <tr className="umumi-grid-colheads">
                  <th className="umumi-grid-col-num">№</th>
                  <th className="vendor-th-amount">Cari ay faktiki yığım</th>
                  <th className="vendor-th-amount">Digər gəlirlər</th>
                  <th className="vendor-th-amount">Əvvəlki balans</th>
                  <th className="vendor-th-amount">Cari ay ümumi gəlir</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="umumi-grid-col-num">1</td>
                  <td className="vendor-amount">{formatMoney(summary.collected)}</td>
                  <td className="vendor-amount">{formatMoney(summary.otherIncome)}</td>
                  <td className={`vendor-amount ${summary.previousBalance < 0 ? "vendor-value-danger" : ""}`}>
                    {formatMoney(summary.previousBalance)}
                  </td>
                  <td className="vendor-amount umumi-grid-emphasis">{formatMoney(summary.monthlyIncome)}</td>
                </tr>
              </tbody>
            </table>

            <table className="umumi-grid-table">
              <thead>
                <tr>
                  <th colSpan={4} className="umumi-grid-band">
                    Aylıq xərclər barədə hesabat (manatla)
                  </th>
                </tr>
                <tr className="umumi-grid-colheads">
                  <th className="umumi-grid-col-num">№</th>
                  <th>Kateqoriya</th>
                  <th>Təsvir</th>
                  <th className="vendor-th-amount">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {summary.expenseRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="umumi-empty">
                      Bu ay üzrə xərc qeydə alınmayıb.
                    </td>
                  </tr>
                ) : (
                  summary.expenseRows.map((row, i) => (
                    <tr key={row.id}>
                      {categoryRowSpans.has(i) && (
                        <>
                          <td rowSpan={categoryRowSpans.get(i)} className="umumi-grid-col-num">
                            {categoryGroupNumbers.get(i)}
                          </td>
                          <td rowSpan={categoryRowSpans.get(i)} className="umumi-grid-category">
                            {row.category}
                          </td>
                        </>
                      )}
                      <td>{row.description}</td>
                      <td className="vendor-amount">{formatMoney(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {summary.expenseRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={3}>Cəmi xərc</td>
                    <td className="vendor-amount">{formatMoney(summary.totalExpense)}</td>
                  </tr>
                </tfoot>
              )}
            </table>

            <table className="umumi-grid-table">
              <thead>
                <tr>
                  <th colSpan={6} className="umumi-grid-band">
                    Yekun hesabat (manatla)
                  </th>
                </tr>
                <tr className="umumi-grid-colheads">
                  <th className="vendor-th-amount">Əvvəlki balans</th>
                  <th className="vendor-th-amount">Cari aylıq gəlir</th>
                  <th className="vendor-th-amount">Digər gəlirlər</th>
                  <th className="vendor-th-amount">Aylıq cəmi balans</th>
                  <th className="vendor-th-amount">Cəmi aylıq xərc</th>
                  <th className="vendor-th-amount">Yekun balans</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`vendor-amount ${summary.previousBalance < 0 ? "vendor-value-danger" : ""}`}>
                    {formatMoney(summary.previousBalance)}
                  </td>
                  <td className="vendor-amount">{formatMoney(summary.collected)}</td>
                  <td className="vendor-amount">{formatMoney(summary.otherIncome)}</td>
                  <td className={`vendor-amount ${summary.monthlyBalance < 0 ? "vendor-value-danger" : ""}`}>
                    {formatMoney(summary.monthlyBalance)}
                  </td>
                  <td className="vendor-amount">{formatMoney(summary.totalExpense)}</td>
                  <td className={`vendor-amount umumi-grid-emphasis ${summary.finalBalance < 0 ? "vendor-value-danger" : ""}`}>
                    {formatMoney(summary.finalBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="umumi-grid-footer">
            <span>Hazırlanma tarixi: {generatedOn}</span>
            {companyBalance && (
              <span>
                Rəsmi balans (bütün tarix üzrə):{" "}
                <strong className={companyBalance.currentBalance < 0 ? "vendor-value-danger" : "vendor-value-ok"}>
                  {formatMoney(companyBalance.currentBalance)}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
