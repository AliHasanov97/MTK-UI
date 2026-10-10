"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../../lib/api/buildings";
import {
  APPLICATION_KINDS,
  ORDER_FOR_APPLICATION,
  applicationKindFromValue,
  createApplication,
  searchApplications,
  type ApplicationItem,
  type ApplicationKind,
} from "../../../lib/api/hr";
import { formatDateTime } from "../../../lib/format";
import { Modal } from "../../Modal";
import { DocumentDetailModal, type DocTarget } from "../DocumentDetailModal";
import { DynamicForm, buildBody, missingRequired, type FormValues } from "../DynamicForm";
import { APPLICATION_FIELDS } from "../documentConfig";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, hrErrorMessage } from "../shared";

const KINDS = Object.keys(APPLICATION_KINDS) as ApplicationKind[];

export function ErizelerView() {
  const auth = useAuth();
  const [items, setItems] = useState<ApplicationItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
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
    if (filterType) {
      filters.push({ columnName: "Type", comparison: QueryComparisonType.Equals, value: Number(filterType) });
    }
    if (filterStatus) {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.Equals, value: Number(filterStatus) });
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
          {KINDS.map((k) => (
            <option key={k} value={APPLICATION_KINDS[k].value}>
              {APPLICATION_KINDS[k].label}
            </option>
          ))}
        </select>
        <select className="panel-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Bütün statuslar</option>
          <option value="0">Gözləmədə</option>
          <option value="1">Əmrə çevrilib</option>
        </select>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowCreate(true)}
        >
          + Yeni ərizə
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
                  <th>Ərizə №</th>
                  <th>Növ</th>
                  <th>İşçi / namizəd</th>
                  <th>Yaradan</th>
                  <th>Tarix</th>
                  <th>Status</th>
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

function CreateApplicationModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<ApplicationKind>("Vacation");
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specs = APPLICATION_FIELDS[kind];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = missingRequired(specs, values);
    if (missing) {
      setError(missing);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createApplication(accessToken, kind, buildBody(specs, values));
      onCreated();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni ərizə" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="app-kind">Ərizə növü</label>
          <select
            id="app-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ApplicationKind);
              setValues({});
              setError(null);
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {APPLICATION_KINDS[k].label}
              </option>
            ))}
          </select>
        </div>

        <DynamicForm
          specs={specs}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />

        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
