"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { SortDirection, searchApartments, type Apartment } from "../../lib/api/buildings";
import { searchGarages, type GarageListItem } from "../../lib/api/garages";
import {
  getAnnualPaymentReport,
  type AnnualPaymentReportResponse,
  type PropertyAnnualReportRow,
} from "../../lib/api/payments";
import { BalanceTag } from "../binalar/finance";

// One big pull for the property lists — same pattern as Borclar/Tranzaksiyalar: the
// server-side filter can only express one comparison and the grid needs every
// apartment/garage anyway (the backend's annual-report endpoint supplies the
// per-month charge data, already aggregated per property).
const FETCH_SIZE = 1000;

const AZ_MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "İyn",
  "İyl", "Avq", "Sen", "Okt", "Noy", "Dek",
];

const AZ_MONTHS_FULL = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

// Rendered through a portal straight into <body> — a CSS pseudo-element tooltip
// anchored inside the table gets clipped by the table's own horizontal-scroll
// container (overflow-x:auto clips any content that pops outside its box, in
// every direction, regardless of position:absolute). Fixed positioning computed
// from the hovered cell's own getBoundingClientRect sidesteps that entirely.
const TOOLTIP_WIDTH = 230;
const VIEWPORT_MARGIN = 10;

type TooltipState = { rect: DOMRect; lines: string[] };

function HesabatTooltip({ rect, lines }: TooltipState) {
  const centerX = rect.left + rect.width / 2;
  const half = TOOLTIP_WIDTH / 2;
  const clampedX = Math.min(
    Math.max(centerX, half + VIEWPORT_MARGIN),
    window.innerWidth - half - VIEWPORT_MARGIN,
  );
  // Flip below the cell when there isn't enough room above (e.g. the top table rows).
  const below = rect.top < 90;

  return (
    <div
      className="hesabat-tooltip"
      style={{
        left: clampedX,
        top: below ? rect.bottom + 10 : rect.top - 10,
        transform: below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
    >
      {lines.map((line, i) => (
        <div key={i} className={i === 0 ? "hesabat-tooltip-title" : undefined}>
          {line}
        </div>
      ))}
      <span
        className="hesabat-tooltip-arrow"
        data-direction={below ? "up" : "down"}
        style={{
          left: centerX - clampedX + half,
          ...(below ? { top: -5 } : { bottom: -5 }),
        }}
      />
    </div>
  );
}

type RowKind = "apartment" | "garage";

type Row = {
  key: string;
  propertyId: string;
  kind: RowKind;
  label: string;
  buildingId?: string;
  buildingName?: string;
  href: string;
};

const CURRENT_YEAR = new Date().getFullYear();

export function OdenisQrafikiView() {
  const auth = useAuth();
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [garages, setGarages] = useState<GarageListItem[] | null>(null);
  const [report, setReport] = useState<AnnualPaymentReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | RowKind>("all");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    const token = auth.accessToken;
    Promise.all([
      searchApartments(token, {
        pageSize: FETCH_SIZE,
        sortCriteria: { columnName: "ApartmentNumber", direction: SortDirection.Ascending },
      }),
      searchGarages(token, { pageSize: FETCH_SIZE }),
      getAnnualPaymentReport(token, year),
    ])
      .then(([apartmentsRes, garagesRes, reportRes]) => {
        setApartments(apartmentsRes.items);
        setGarages(garagesRes.items);
        setReport(reportRes);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, year]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: Row[] = useMemo(() => {
    const aptRows: Row[] = (apartments ?? []).map((a) => ({
      key: `apartment:${a.id}`,
      propertyId: a.id,
      kind: "apartment",
      label: `Mənzil ${a.apartmentNumber}`,
      buildingId: a.building.id,
      buildingName: a.building.name,
      href: `/panel/binalar/menzil/${a.id}`,
    }));
    const garageRows: Row[] = (garages ?? []).map((g) => ({
      key: `garage:${g.id}`,
      propertyId: g.id,
      kind: "garage",
      label: `Qaraj ${g.garageNumber}`,
      href: `/panel/binalar/qaraj/${g.id}`,
    }));
    return [...aptRows, ...garageRows];
  }, [apartments, garages]);

  const buildingOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of apartments ?? []) map.set(a.building.id, a.building.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [apartments]);

  const reportByProperty = useMemo(() => {
    const map = new Map<string, PropertyAnnualReportRow>();
    for (const row of report?.properties ?? []) {
      map.set(row.propertyId, row);
    }
    return map;
  }, [report]);

  if (auth.status !== "authenticated") return null;

  const term = search.trim().toLowerCase();
  const visibleRows = rows.filter((r) => {
    if (typeFilter !== "all" && r.kind !== typeFilter) return false;
    if (buildingFilter !== "all" && r.buildingId !== buildingFilter) return false;
    if (term) {
      const haystack = `${r.label} ${r.buildingName ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const loading = !apartments || !garages || !report;
  const yearOptions = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 4 + i);

  return (
    <>
      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      <div className="data-table-wrap">
        <div className="vendor-head">
          <h3>İllik ödəniş qrafiki</h3>
          <span className="vendor-count">{visibleRows.length} əmlak</span>
        </div>

        <div className="ledger-filter-footer" style={{ padding: "12px 18px 0" }}>
          <div className="ledger-segmented" role="group" aria-label="Əmlak növü">
            {(["all", "apartment", "garage"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={typeFilter === value}
                className={typeFilter === value ? "active" : ""}
                onClick={() => setTypeFilter(value)}
              >
                {value === "all" ? "Hamısı" : value === "apartment" ? "Mənzillər" : "Qarajlar"}
              </button>
            ))}
          </div>
          <select className="panel-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="panel-select"
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
          >
            <option value="all">Bütün binalar</option>
            {buildingOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <input
            className="panel-search"
            style={{ maxWidth: 300 }}
            placeholder="Axtar (mənzil, bina, qaraj…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="hesabat-legend">
          <span>
            <i className="hesabat-swatch hesabat-cell-paid" /> Ödənilib
          </span>
          <span>
            <i className="hesabat-swatch hesabat-cell-partial" /> Qismən ödənilib
          </span>
          <span>
            <i className="hesabat-swatch hesabat-cell-unpaid" /> Ödənilməyib
          </span>
          <span>
            <i className="hesabat-swatch hesabat-cell-empty" /> Haqq yoxdur
          </span>
        </div>

        {loading ? (
          <div className="ledger-skeletons" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="ledger-skeleton" />
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="ledger-empty">
            <span aria-hidden="true">⌂</span>
            <strong>Əmlak tapılmadı</strong>
            <p>Bu axtarışa/filterə uyğun mənzil və ya qaraj yoxdur.</p>
          </div>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table hesabat-grid">
              <colgroup>
                <col style={{ width: 150 }} />
                <col style={{ width: 170 }} />
                {AZ_MONTHS_SHORT.map((m) => (
                  <col key={m} style={{ width: 40 }} />
                ))}
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Bina</th>
                  <th className="hesabat-row-head">Əmlak</th>
                  {AZ_MONTHS_SHORT.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                  <th>Borc</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const propertyReport = reportByProperty.get(r.propertyId);
                  const months = propertyReport?.months;
                  return (
                    <tr key={r.key}>
                      <td>{r.buildingName ?? "—"}</td>
                      <td className="hesabat-row-head">
                        <Link className="owner-link" href={r.href}>
                          {r.label}
                        </Link>
                      </td>
                      {AZ_MONTHS_SHORT.map((label, i) => {
                        const cell = months?.[i];
                        const monthName = AZ_MONTHS_FULL[i];
                        if (!cell || cell.status === null) {
                          const lines = [`${monthName} ${year}`, "Bu ay üçün haqq yaradılmayıb"];
                          return (
                            <td
                              key={label}
                              className="hesabat-cell hesabat-cell-empty"
                              onMouseEnter={(e) => setTooltip({ rect: e.currentTarget.getBoundingClientRect(), lines })}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              ·
                            </td>
                          );
                        }
                        // ChargeStatus ordinal: 0 Unpaid, 1 PartiallyPaid, 2 Paid.
                        const cls =
                          cell.status === 2
                            ? "hesabat-cell-paid"
                            : cell.status === 1
                              ? "hesabat-cell-partial"
                              : "hesabat-cell-unpaid";
                        const symbol = cell.status === 2 ? "+" : cell.status === 1 ? "±" : "−";
                        const statusLabel =
                          cell.status === 2 ? "Ödənilib" : cell.status === 1 ? "Qismən ödənilib" : "Ödənilməyib";
                        const remaining = cell.amount - cell.paidAmount;
                        const lines = [
                          `${monthName} ${year}`,
                          `Vəziyyət: ${statusLabel}`,
                          `Aylıq haqq: ${cell.amount.toFixed(2)} ₼`,
                          `Ödənilib: ${cell.paidAmount.toFixed(2)} ₼`,
                          ...(remaining > 0.005 ? [`Qalıq borc: ${remaining.toFixed(2)} ₼`] : []),
                        ];
                        return (
                          <td
                            key={label}
                            className={`hesabat-cell ${cls}`}
                            onMouseEnter={(e) => setTooltip({ rect: e.currentTarget.getBoundingClientRect(), lines })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {symbol}
                          </td>
                        );
                      })}
                      <td>
                        <BalanceTag balance={-(propertyReport?.currentDebt ?? 0)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tooltip && createPortal(<HesabatTooltip rect={tooltip.rect} lines={tooltip.lines} />, document.body)}
    </>
  );
}
