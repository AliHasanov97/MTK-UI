"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../../lib/api/buildings";
import {
  APPLICATION_KINDS,
  ORDER_FOR_APPLICATION,
  applicationKindFromValue,
  searchApplications,
  type ApplicationItem,
  type ApplicationKind,
} from "../../../lib/api/hr";
import { formatDateTime } from "../../../lib/format";
import { ColumnFilter } from "../../ColumnFilter";
import { FilterChip, MobileFilterBar } from "../../MobileFilterBar";
import { DocumentDetailModal, type DocTarget } from "../DocumentDetailModal";
import { CreateApplicationModal } from "../CreateDocumentModals";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, hrErrorMessage } from "../shared";

const KINDS = Object.keys(APPLICATION_KINDS) as ApplicationKind[];
const typeOptions = KINDS.map((k) => ({ value: APPLICATION_KINDS[k].value as number, label: APPLICATION_KINDS[k].label }));
const STATUS_OPTIONS = [
  { value: 0, label: "Gözləmədə" },
  { value: 1, label: "Əmrə çevrilib" },
];

export function ErizelerView() {
  const auth = useAuth();
  const [items, setItems] = useState<ApplicationItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<number[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<DocTarget | null>(null);

  const filterSignature = JSON.stringify([filterType, filterStatus]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const filters = [];
    if (filterType.length > 0) {
      filters.push({ columnName: "Type", comparison: QueryComparisonType.In, value: filterType });
    }
    if (filterStatus.length > 0) {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.In, value: filterStatus });
    }
    searchApplications(auth.accessToken, {
      filters: filters.length > 0 ? filters : null,
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
  }, [auth, filterType, filterStatus, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  const activeFilterCount = [filterType, filterStatus].filter((f) => f.length > 0).length;

  function clearFilters() {
    setFilterType([]);
    setFilterStatus([]);
  }

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
        {activeFilterCount > 0 && (
          <button type="button" className="panel-btn panel-btn-sm" onClick={clearFilters}>
            Filtrləri təmizlə ({activeFilterCount})
          </button>
        )}
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowCreate(true)}
        >
          + Yeni ərizə
        </button>
      </div>

      <MobileFilterBar activeCount={activeFilterCount} onClear={clearFilters}>
        <FilterChip label="Növ">
          <ColumnFilter options={typeOptions} selected={filterType} onChange={setFilterType} />
        </FilterChip>
        <FilterChip label="Status">
          <ColumnFilter options={STATUS_OPTIONS} selected={filterStatus} onChange={setFilterStatus} />
        </FilterChip>
      </MobileFilterBar>

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
                  <th>Ərizə №</th>
                  <th>
                    <div className="th-row">
                      <span className="th-label">Növ</span>
                      <ColumnFilter options={typeOptions} selected={filterType} onChange={setFilterType} />
                    </div>
                  </th>
                  <th>İşçi / namizəd</th>
                  <th>Yaradan</th>
                  <th>Tarix</th>
                  <th>
                    <div className="th-row">
                      <span className="th-label">Status</span>
                      <ColumnFilter options={STATUS_OPTIONS} selected={filterStatus} onChange={setFilterStatus} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {items.map((a) => {
                  const kind = applicationKindFromValue(a.type);
                  const pending = a.status === "PendingApproval";
                  return (
                    <tr
                      key={a.id}
                      className="doc-row"
                      onClick={() => kind && setDetail({ type: "application", kind, id: a.id })}
                    >
                      <td>{a.applicationNumber}</td>
                      <td>{kind ? APPLICATION_KINDS[kind].label : a.type}</td>
                      <td>{a.employee?.name ?? a.jobApplicant?.name ?? "—"}</td>
                      <td>{a.createdBy?.name ?? "—"}</td>
                      <td>{formatDateTime(a.createdAt)}</td>
                      <td>
                        {pending || !kind || !a.order ? (
                          <span className="panel-role-tag panel-role-tag-warn">Gözləmədə</span>
                        ) : (
                          <button
                            type="button"
                            className="panel-role-tag panel-role-tag-good doc-status-link"
                            title="Əlaqəli əmri aç"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetail({ type: "order", kind: ORDER_FOR_APPLICATION[kind], id: a.order!.id });
                            }}
                          >
                            Əmrə çevrilib · №{a.order.name} →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={pageNumber} pageCount={pageCount} totalCount={totalCount} onChange={setPageNumber} />
        </div>
      )}

      {showCreate && (
        <CreateApplicationModal
          accessToken={accessToken}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {detail && (
        <DocumentDetailModal
          accessToken={accessToken}
          target={detail}
          onClose={() => setDetail(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
