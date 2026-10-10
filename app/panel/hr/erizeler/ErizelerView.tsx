"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../../lib/api/buildings";
import {
  APPLICATION_KINDS,
  applicationKindFromValue,
  convertApplication,
  createApplication,
  deleteApplication,
  downloadApplicationPdf,
  searchApplications,
  searchLaborCodeCases,
  type ApplicationItem,
  type ApplicationKind,
  type LaborCodeCase,
} from "../../../lib/api/hr";
import { formatDateTime } from "../../../lib/format";
import { Modal } from "../../Modal";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [converting, setConverting] = useState<ApplicationItem | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

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

  async function run(id: string, action: () => Promise<unknown>, success?: string) {
    setWorkingId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  function handleConvert(item: ApplicationItem, kind: ApplicationKind) {
    // Vakansiyaya müraciətin işə qəbul əmrinə çevrilməsi əlavə məlumat tələb edir
    if (kind === "JobApplication") {
      setConverting(item);
      return;
    }
    run(item.id, () => convertApplication(accessToken, kind, item.id), `Ərizə №${item.applicationNumber} əmrə çevrildi.`);
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
      {notice && <p className="panel-page-lead">{notice}</p>}

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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {items.map((a) => {
                  const kind = applicationKindFromValue(a.type);
                  const pending = a.status === "PendingApproval";
                  return (
                    <tr key={a.id}>
                      <td>{a.applicationNumber}</td>
                      <td>{kind ? APPLICATION_KINDS[kind].label : a.type}</td>
                      <td>{a.employee?.name ?? a.jobApplicant?.name ?? "—"}</td>
                      <td>{a.createdBy?.name ?? "—"}</td>
                      <td>{formatDateTime(a.createdAt)}</td>
                      <td>
                        <span className={`panel-role-tag ${pending ? "panel-role-tag-warn" : "panel-role-tag-good"}`}>
                          {pending ? "Gözləmədə" : `Əmrə çevrilib${a.order ? ` (№${a.order.name})` : ""}`}
                        </span>
                      </td>
                      <td>
                        {kind && (
                          <div className="data-table-actions">
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm"
                              disabled={workingId === a.id}
                              onClick={() => run(a.id, () => downloadApplicationPdf(accessToken, kind, a.id))}
                            >
                              PDF
                            </button>
                            {pending && (
                              <>
                                <button
                                  type="button"
                                  className="panel-btn panel-btn-sm"
                                  disabled={workingId === a.id}
                                  onClick={() => handleConvert(a, kind)}
                                >
                                  Əmrə çevir
                                </button>
                                <button
                                  type="button"
                                  className="panel-btn panel-btn-sm panel-btn-danger"
                                  disabled={workingId === a.id}
                                  onClick={() => {
                                    if (!window.confirm(`Ərizə №${a.applicationNumber} silinsin?`)) return;
                                    run(a.id, () => deleteApplication(accessToken, kind, a.id));
                                  }}
                                >
                                  Sil
                                </button>
                              </>
                            )}
                          </div>
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
      {converting && (
        <ConvertJobApplicationModal
          accessToken={accessToken}
          application={converting}
          onClose={() => setConverting(null)}
          onConverted={() => {
            setConverting(null);
            setNotice(
              "Ərizə işə qəbul əmrinə çevrildi. İşçi kartı bir neçə saniyə ərzində avtomatik yaradılacaq.",
            );
            setReloadKey((k) => k + 1);
          }}
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

function ConvertJobApplicationModal({
  accessToken,
  application,
  onClose,
  onConverted,
}: {
  accessToken: string;
  application: ApplicationItem;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [cases, setCases] = useState<LaborCodeCase[] | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [caseId, setCaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchLaborCodeCases(accessToken, { pageSize: 100 })
      .then((res) => setCases(res.data.filter((c) => c.parentId !== null)))
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) {
      setError("Müddətli müqavilənin əsası seçilməlidir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await convertApplication(accessToken, "JobApplication", application.id, {
        startDate,
        endDate,
        laborCodeCaseId: caseId,
      });
      onConverted();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={`${application.jobApplicant?.name ?? "Namizəd"} — işə qəbul əmri`} wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="conv-start">Müqavilənin başlanğıcı</label>
          <input id="conv-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="conv-end">Müqavilənin bitməsi</label>
          <input id="conv-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="conv-case">Müddətli müqavilənin əsası (Əmək Məcəlləsi, maddə 47)</label>
          <select id="conv-case" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">Seçin…</option>
            {cases?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentName ? `m. ${c.parentName} — ` : ""}
                {c.code}) {c.name.length > 110 ? `${c.name.slice(0, 110)}…` : c.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Əmrə çevir"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
