"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../../lib/api/buildings";
import {
  ORDER_KINDS,
  createDirectOrder,
  orderKindFromValue,
  searchOrders,
  type DirectOrderKind,
  type OrderItem,
  type OrderKind,
} from "../../../lib/api/hr";
import { formatDateTime } from "../../../lib/format";
import { Modal } from "../../Modal";
import { DocumentDetailModal, type DocTarget } from "../DocumentDetailModal";
import { DynamicForm, buildBody, missingRequired, type FormValues } from "../DynamicForm";
import { DIRECT_ORDER_FIELDS } from "../documentConfig";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, hrErrorMessage } from "../shared";

const ORDER_KEYS = Object.keys(ORDER_KINDS) as OrderKind[];
const DIRECT_KEYS = Object.keys(DIRECT_ORDER_FIELDS) as DirectOrderKind[];

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

function CreateOrderModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<DirectOrderKind>("Bonus");
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = DIRECT_ORDER_FIELDS[kind];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = missingRequired(config.fields, values);
    if (missing) {
      setError(missing);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDirectOrder(accessToken, kind, buildBody(config.fields, values));
      onCreated();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni əmr" onClose={onClose}>
      <p className="panel-page-lead">
        Yalnız ərizəsiz verilən əmrlər burada yaradılır. İşə qəbul, məzuniyyət, vəzifə və iş rejimi dəyişikliyi əmrləri
        müvafiq ərizənin təsdiqi ilə avtomatik yaranır.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="order-kind">Əmr növü</label>
          <select
            id="order-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as DirectOrderKind);
              setValues({});
              setError(null);
            }}
          >
            {DIRECT_KEYS.map((k) => (
              <option key={k} value={k}>
                {DIRECT_ORDER_FIELDS[k].label}
              </option>
            ))}
          </select>
        </div>

        <DynamicForm
          specs={config.fields}
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
