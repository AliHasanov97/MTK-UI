"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { formatDateTime } from "../../../lib/format";
import {
  NOMENCLATURE_CATEGORY_LABELS,
  UNIT_LABELS,
  categoryFromOrdinal,
  getAllStock,
  getLowStockItems,
  getStockByNomenclature,
  searchNomenclatures,
  unitFromOrdinal,
  type LowStockDto,
  type NomenclatureListItem,
  type StockDto,
  type StockResponse,
} from "../../../lib/api/inventory";
import { errorMessage, formatQuantity } from "../shared";
import { EntityLink, entityHref } from "../../EntityLinks";

type Segment = "stock" | "low";

export function AnbarView() {
  const auth = useAuth();
  const [segment, setSegment] = useState<Segment>("stock");

  if (auth.status !== "authenticated") return null;

  return (
    <div>
      <div className="vendor-segments" role="group" aria-label="Bölmə">
        <button
          type="button"
          className={segment === "stock" ? "active" : ""}
          aria-pressed={segment === "stock"}
          onClick={() => setSegment("stock")}
        >
          Qalıqlar
        </button>
        <button
          type="button"
          className={segment === "low" ? "active" : ""}
          aria-pressed={segment === "low"}
          onClick={() => setSegment("low")}
        >
          Az qalan
        </button>
      </div>

      {segment === "stock" ? <StockSegment /> : <LowStockSegment />}
    </div>
  );
}

const PAGE_SIZE = 10;
// Every stock row is loaded once to look up quantities for the current page and
// to fill the summary tiles; the stock endpoint has no search or total count.
const STOCK_FETCH_SIZE = 1000;

type StockStatus = "ok" | "low" | "out" | "none";

const STOCK_STATUS: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: "Kifayətdir", className: "vendor-status-active" },
  low: { label: "Az qalıb", className: "vendor-status-partial" },
  out: { label: "Bitib", className: "vendor-status-suspended" },
  none: { label: "Daxil edilməyib", className: "vendor-status-cancelled" },
};

function stockStatus(stock: StockDto | undefined, detail: StockResponse | undefined): StockStatus {
  if (!stock) return "none";
  if (stock.quantityOnHand <= 0) return "out";
  if (detail?.isLowStock) return "low";
  return "ok";
}

function StockSegment() {
  const auth = useAuth();
  const [items, setItems] = useState<NomenclatureListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [stocks, setStocks] = useState<Map<string, StockDto> | null>(null);
  const [lowCount, setLowCount] = useState(0);
  const [details, setDetails] = useState<Record<string, StockResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new search term restarts pagination from the first page.
  const filterSignature = JSON.stringify(searchTerm);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([
      getAllStock(auth.accessToken, 1, STOCK_FETCH_SIZE),
      getLowStockItems(auth.accessToken).catch(() => []),
    ])
      .then(([stockRows, lowRows]) => {
        setStocks(new Map(stockRows.map((row) => [row.nomenclatureId, row])));
        setLowCount(lowRows.length);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchNomenclatures(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      sortCriteria: { columnName: "Code", direction: 0 },
      // Warehouse nomenklatura axtarışı səhifəni 1-dən sayır.
      page: pageNumber,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.nomenclatures);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber]);

  // Min. stock and the low-stock flag only come from the per-material endpoint,
  // which fails for materials that were never received — so only ask for those
  // that have a stock row.
  useEffect(() => {
    if (auth.status !== "authenticated" || !items || !stocks) return;
    const ids = items.map((item) => item.id).filter((id) => stocks.has(id));
    let active = true;
    Promise.all(ids.map((id) => getStockByNomenclature(auth.accessToken, id).catch(() => null))).then(
      (rows) => {
        if (!active) return;
        setDetails((prev) => {
          const next = { ...prev };
          for (const row of rows) if (row) next[row.nomenclatureId] = row;
          return next;
        });
      },
    );
    return () => {
      active = false;
    };
  }, [auth, items, stocks]);

  if (auth.status !== "authenticated") return null;

  if (error && !items) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const stockRows = stocks ? [...stocks.values()] : [];
  const inStockCount = stockRows.filter((row) => row.quantityOnHand > 0).length;
  const outCount = stockRows.filter((row) => row.quantityOnHand <= 0).length;

  return (
    <>
      <div className="ledger-stats">
        <article className="ledger-stat ledger-stat-in">
          <span className="ledger-stat-label">Anbarda olan</span>
          <strong className="ledger-value-in">{stocks ? inStockCount : "…"}</strong>
          <span className="ledger-stat-caption">material qalıqdadır</span>
        </article>
        <article className="ledger-stat ledger-stat-net">
          <span className="ledger-stat-label">Az qalan</span>
          <strong className={lowCount > 0 ? "vendor-value-warn" : "ledger-value-in"}>{stocks ? lowCount : "…"}</strong>
          <span className="ledger-stat-caption">minimum ehtiyatdan aşağı</span>
        </article>
        <article className="ledger-stat ledger-stat-out">
          <span className="ledger-stat-label">Bitib</span>
          <strong className={outCount > 0 ? "ledger-value-out" : "ledger-value-in"}>{stocks ? outCount : "…"}</strong>
          <span className="ledger-stat-caption">qalığı sıfırdır</span>
        </article>
      </div>

      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (kod, ad…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      <div className="data-table-wrap">
        <div className="vendor-head">
          <h3>Anbar qalıqları</h3>
          <span className="vendor-count">{totalCount} material</span>
        </div>

        {!items || !stocks ? (
          <div className="ledger-skeletons" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ledger-skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="ledger-empty">
            <span aria-hidden="true">⌗</span>
            <strong>Material tapılmadı</strong>
            <p>{searchTerm ? "Bu axtarışa uyğun material tapılmadı." : "Hələ heç bir material əlavə edilməyib."}</p>
          </div>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Material</th>
                  <th>Kateqoriya</th>
                  <th className="vendor-th-amount">Qalıq</th>
                  <th className="vendor-th-amount">Min. ehtiyat</th>
                  <th>Status</th>
                  <th>Son əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const stock = stocks.get(item.id);
                  const detail = details[item.id];
                  const status = STOCK_STATUS[stockStatus(stock, detail)];
                  const unit = UNIT_LABELS[unitFromOrdinal(item.unit)];
                  return (
                    <tr key={item.id}>
                      <td><EntityLink href={entityHref.nomenclature(item.id)}>{item.code}</EntityLink></td>
                      <td className="vendor-cell-vendor">
                        <Link className="owner-link" href={`/panel/inventar/materiallar/${item.id}`}>
                          {item.name}
                        </Link>
                        {item.description && <span className="vendor-cell-sub">{item.description}</span>}
                      </td>
                      <td>{NOMENCLATURE_CATEGORY_LABELS[categoryFromOrdinal(item.category)]}</td>
                      <td className="vendor-amount">
                        <strong>{formatQuantity(stock?.quantityOnHand ?? 0)}</strong> {unit}
                      </td>
                      <td className="vendor-amount">
                        {detail?.minStockLevel != null ? `${formatQuantity(detail.minStockLevel)} ${unit}` : "—"}
                      </td>
                      <td>
                        <span className={`vendor-status ${status.className}`}>{status.label}</span>
                      </td>
                      <td>{stock?.lastTransactionDate ? formatDateTime(stock.lastTransactionDate) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel-pagination">
          <span>
            Səhifə {pageNumber}/{pageCount}
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
              disabled={pageNumber >= pageCount}
              onClick={() => setPageNumber((p) => p + 1)}
            >
              Növbəti
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function LowStockSegment() {
  const auth = useAuth();
  const [items, setItems] = useState<LowStockDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getLowStockItems(auth.accessToken)
      .then((res) => {
        setItems(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="data-table-wrap">
      <div className="vendor-head">
        <h3>Minimum ehtiyatdan aşağı</h3>
        <span className="vendor-count">{items?.length ?? 0} material</span>
      </div>

      {!items ? (
        <div className="ledger-skeletons" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ledger-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="ledger-empty">
          <span aria-hidden="true">✓</span>
          <strong>Bütün ehtiyatlar kifayətdir</strong>
          <p>Heç bir material minimum ehtiyat səviyyəsindən aşağı deyil.</p>
        </div>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="vendor-th-amount">Qalıq</th>
                <th className="vendor-th-amount">Min. ehtiyat</th>
                <th className="vendor-th-amount">Çatışmır</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.nomenclatureId}>
                  <td className="vendor-cell-vendor">
                    <Link className="owner-link" href={`/panel/inventar/materiallar/${s.nomenclatureId}`}>{s.nomenclatureName}</Link>
                    <span className="vendor-cell-sub">{s.nomenclatureCode}</span>
                  </td>
                  <td className="vendor-amount">
                    <strong className="vendor-value-danger">{formatQuantity(s.quantityOnHand)}</strong>
                  </td>
                  <td className="vendor-amount">{formatQuantity(s.minStockLevel)}</td>
                  <td className="vendor-amount">
                    <strong className="vendor-value-danger">{formatQuantity(s.deficit)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
