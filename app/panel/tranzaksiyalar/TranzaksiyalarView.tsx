"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { SortDirection } from "../../lib/api/buildings";
import {
  TRANSACTION_DIRECTION_LABELS,
  searchTransactions,
  transactionDirectionFromOrdinal,
  type TransactionDirectionKey,
  type TransactionResponse,
} from "../../lib/api/payments";

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

// Ledger rows are written by the backend, never by hand: a resident payment posts
// an income entry, and cancelling a payment posts the matching reversal.
type Row = {
  key: string;
  date: string;
  kind: "income" | "expense";
  direction: TransactionDirectionKey;
  category: string;
  note: string;
  amount: number; // signed: income positive, expense negative
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

// ISO timestamps are what the backend stores; the day they belong to is the UTC
// day, so both the filter bounds and the display stay on the raw value.
function rangeStartIso(date: string) {
  return `${date}T00:00:00.000Z`;
}

function rangeEndIso(date: string) {
  return `${date}T23:59:59.999Z`;
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
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => currentMonthRange().start);
  const [endDate, setEndDate] = useState(() => currentMonthRange().end);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

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
        date: t.transactionDate,
        kind: direction === "Income" ? "income" : "expense",
        direction,
        category: t.category,
        note: t.description ?? "—",
        amount: direction === "Income" ? t.amount : -t.amount,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const term = search.trim().toLowerCase();
  const rows = allRows.filter((row) => {
    if (startDate && row.date < rangeStartIso(startDate)) return false;
    if (endDate && row.date > rangeEndIso(endDate)) return false;
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
              </colgroup>
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Növ</th>
                  <th>Kateqoriya</th>
                  <th>Qeyd</th>
                  <th className="ledger-th-amount">Məbləğ (₼)</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const groupNet = group.income - group.expense;
                  return (
                    <Fragment key={group.key}>
                      <tr className="ledger-month-row">
                        <td colSpan={5}>
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
                        <tr key={row.key}>
                          <td className="ledger-cell-date">{formatDate(row.date)}</td>
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
        Jurnal yalnız real əməliyyatlardan yaranır: tranzaksiya nə manual yaradıla, nə də silinə bilər. Ödəniş ləğv
        edildikdə əvvəlki qeyd silinmir, ona əks (geri qaytarma) qeydi əlavə olunur.
      </p>
    </div>
  );
}
