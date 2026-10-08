"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { formatDateTime } from "../../../lib/format";
import {
  getAllStock,
  getLowStockItems,
  type LowStockDto,
  type StockDto,
} from "../../../lib/api/inventory";
import { errorMessage, formatQuantity } from "../shared";

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

function StockSegment() {
  const auth = useAuth();
  const [stocks, setStocks] = useState<StockDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getAllStock(auth.accessToken)
      .then((res) => {
        setStocks(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  if (auth.status !== "authenticated") return null;

  const term = search.trim().toLowerCase();
  const visible = (stocks ?? []).filter((s) =>
    term
      ? `${s.nomenclatureCode} ${s.nomenclatureName}`.toLowerCase().includes(term)
      : true,
  );

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
        <h3>Anbar qalıqları</h3>
        <span className="vendor-count">{visible.length} material</span>
      </div>

      <div className="ledger-filter-footer" style={{ padding: "12px 18px 0" }}>
        <input
          className="panel-search"
          style={{ maxWidth: 320 }}
          placeholder="Axtar (kod, ad…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!stocks ? (
        <div className="ledger-skeletons" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="ledger-skeleton" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="ledger-empty">
          <span aria-hidden="true">⌗</span>
          <strong>Qalıq yoxdur</strong>
          <p>
            {stocks.length === 0
              ? "Hələ heç bir mal daxil edilməyib."
              : "Bu axtarışa uyğun material tapılmadı."}
          </p>
        </div>
      ) : (
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="vendor-th-amount">Qalıq</th>
                <th>Son əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.nomenclatureId}>
                  <td className="vendor-cell-vendor">
                    <Link className="owner-link" href={`/panel/inventar/materiallar/${s.nomenclatureId}`}>{s.nomenclatureName}</Link>
                    <span className="vendor-cell-sub">{s.nomenclatureCode}</span>
                  </td>
                  <td className="vendor-amount">
                    <strong>{formatQuantity(s.quantityOnHand)}</strong>
                  </td>
                  <td>{formatDateTime(s.lastTransactionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
