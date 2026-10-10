"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../../lib/api/buildings";
import {
  ORDER_KINDS,
  orderKindFromValue,
  searchOrders,
  type OrderItem,
  type OrderKind,
} from "../../../lib/api/hr";
import { formatDateTime } from "../../../lib/format";
import { DocumentDetailModal, type DocTarget } from "../DocumentDetailModal";
import { CreateOrderModal } from "../CreateDocumentModals";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, hrErrorMessage } from "../shared";

const ORDER_KEYS = Object.keys(ORDER_KINDS) as OrderKind[];

export function EmrlerView() {
  const auth = useAuth();
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<DocTarget | null>(null);

  const [prevFilterType, setPrevFilterType] = useState(filterType);
  if (filterType !== prevFilterType) {
    setPrevFilterType(filterType);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchOrders(auth.accessToken, {
      filters: filterType
        ? [{ columnName: "Type", comparison: QueryComparisonType.Equals, value: Number(filterType) }]
        : null,
      sortCriteria: { columnName: "CreatedAt", direction: 1 },
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.data);
        setTotalCount(res.totalCount);
        setPageCount(res.pageCount);
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [auth, filterType, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  if (error && !items) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-toolbar">
        <select className="panel-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Bütün növlər</option>
          {ORDER_KEYS.map((k) => (
            <option key={k} value={ORDER_KINDS[k].value}>
              {ORDER_KINDS[k].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowCreate(true)}
        >
          + Yeni əmr
        </button>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!items ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Əmr №</th>
                  <th>Növ</th>
                  <th>İşçi / namizəd</th>
                  <th>Yaradan</th>
                  <th>Tarix</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {items.map((o) => {
                  const kind = orderKindFromValue(o.type);
                  return (
                    <tr
                      key={o.id}
                      className="doc-row"
                      onClick={() => kind && setDetail({ type: "order", kind, id: o.id })}
                    >
                      <td>{o.orderNumber}</td>
                      <td>{kind ? ORDER_KINDS[kind].label : o.type}</td>
                      <td>{o.employee?.name ?? o.jobApplicant?.name ?? "Bütün işçilər"}</td>
                      <td>{o.createdBy?.name ?? "—"}</td>
                      <td>{formatDateTime(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={pageNumber} pageCount={pageCount} totalCount={totalCount} onChange={setPageNumber} />
        </div>
      )}

      {detail && (
        <DocumentDetailModal
          accessToken={accessToken}
          target={detail}
          onClose={() => setDetail(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}

      {showCreate && (
        <CreateOrderModal
          accessToken={accessToken}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
