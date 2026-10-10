"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import {
  INSTITUTION_TYPES,
  createInstitution,
  createJob,
  deleteInstitution,
  deleteJob,
  optionLabel,
  searchInstitutions,
  searchJobs,
  updateInstitution,
  updateJob,
  type EducationalInstitution,
  type Job,
} from "../../../lib/api/hr";
import { Modal } from "../../Modal";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, hrErrorMessage } from "../shared";

type Section = "jobs" | "institutions";

export function LugetlerView() {
  const [section, setSection] = useState<Section>("jobs");
  return (
    <div>
      <div className="panel-toolbar">
        <button
          type="button"
          className={`panel-btn ${section === "jobs" ? "panel-btn-primary" : ""}`}
          onClick={() => setSection("jobs")}
        >
          Vəzifələr
        </button>
        <button
          type="button"
          className={`panel-btn ${section === "institutions" ? "panel-btn-primary" : ""}`}
          onClick={() => setSection("institutions")}
        >
          Təhsil ocaqları
        </button>
      </div>
      {section === "jobs" ? <JobsSection /> : <InstitutionsSection />}
    </div>
  );
}

/** Ad (və istəyə görə növ) üzrə sadə lüğət siyahısı: axtarış, səhifələmə, əlavə/redaktə/silmə. */
function useCatalog<T extends { id: string }>(
  load: (token: string, params: { searchTerm?: string; page: number; pageSize: number }) => Promise<{
    data: T[];
    totalCount: number;
    pageCount: number;
  }>,
) {
  const auth = useAuth();
  const [items, setItems] = useState<T[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [prevTerm, setPrevTerm] = useState(searchTerm);
  if (searchTerm !== prevTerm) {
    setPrevTerm(searchTerm);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    load(auth.accessToken, { searchTerm: searchTerm || undefined, page: pageNumber - 1, pageSize: PAGE_SIZE })
      .then((res) => {
        setItems(res.data);
        setTotalCount(res.totalCount);
        setPageCount(res.pageCount);
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
    // `load` is a stable module-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, searchTerm, pageNumber, reloadKey]);

  return {
    auth,
    items,
    totalCount,
    pageCount,
    error,
    setError,
    searchInput,
    setSearchInput,
    pageNumber,
    setPageNumber,
    reload: () => setReloadKey((k) => k + 1),
  };
}

const loadJobs = (token: string, p: { searchTerm?: string; page: number; pageSize: number }) =>
  searchJobs(token, { ...p, sortCriteria: { columnName: "Name", direction: 0 } });

function JobsSection() {
  const c = useCatalog<Job>(loadJobs);
  const [editing, setEditing] = useState<Job | "new" | null>(null);

  if (c.auth.status !== "authenticated") return null;
  const accessToken = c.auth.accessToken;

  async function handleDelete(job: Job) {
    if (!window.confirm(`"${job.name}" vəzifəsi silinsin?`)) return;
    try {
      await deleteJob(accessToken, job.id);
      c.reload();
    } catch (err) {
      c.setError(hrErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Vəzifə axtar…"
          value={c.searchInput}
          onChange={(e) => c.setSearchInput(e.target.value)}
        />
        <button type="button" className="panel-btn panel-btn-primary" style={{ marginLeft: "auto" }} onClick={() => setEditing("new")}>
          + Yeni vəzifə
        </button>
      </div>
      {c.error && <p className="ledger-alert" role="alert">{c.error}</p>}
      {!c.items ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vəzifə</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {c.items.length === 0 && (
                <tr>
                  <td colSpan={2}>Nəticə tapılmadı.</td>
                </tr>
              )}
              {c.items.map((j) => (
                <tr key={j.id}>
                  <td>{j.name}</td>
                  <td>
                    <div className="data-table-actions">
                      <button type="button" className="panel-btn panel-btn-sm" onClick={() => setEditing(j)}>
                        Redaktə
                      </button>
                      <button type="button" className="panel-btn panel-btn-sm panel-btn-danger" onClick={() => handleDelete(j)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={c.pageNumber} pageCount={c.pageCount} totalCount={c.totalCount} onChange={c.setPageNumber} />
        </div>
      )}
      {editing && (
        <NameModal
          title={editing === "new" ? "Yeni vəzifə" : "Vəzifəni redaktə et"}
          initialName={editing === "new" ? "" : editing.name}
          onClose={() => setEditing(null)}
          onSave={async (name) => {
            if (editing === "new") await createJob(accessToken, name);
            else await updateJob(accessToken, editing.id, name);
            setEditing(null);
            c.reload();
          }}
        />
      )}
    </div>
  );
}

const loadInstitutions = (token: string, p: { searchTerm?: string; page: number; pageSize: number }) =>
  searchInstitutions(token, { ...p, sortCriteria: { columnName: "Name", direction: 0 } });

function InstitutionsSection() {
  const c = useCatalog<EducationalInstitution>(loadInstitutions);
  const [editing, setEditing] = useState<EducationalInstitution | "new" | null>(null);

  if (c.auth.status !== "authenticated") return null;
  const accessToken = c.auth.accessToken;

  async function handleDelete(item: EducationalInstitution) {
    if (!window.confirm(`"${item.name}" silinsin?`)) return;
    try {
      await deleteInstitution(accessToken, item.id);
      c.reload();
    } catch (err) {
      c.setError(hrErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Təhsil ocağı axtar…"
          value={c.searchInput}
          onChange={(e) => c.setSearchInput(e.target.value)}
        />
        <button type="button" className="panel-btn panel-btn-primary" style={{ marginLeft: "auto" }} onClick={() => setEditing("new")}>
          + Yeni təhsil ocağı
        </button>
      </div>
      {c.error && <p className="ledger-alert" role="alert">{c.error}</p>}
      {!c.items ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Növ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {c.items.length === 0 && (
                <tr>
                  <td colSpan={3}>Nəticə tapılmadı.</td>
                </tr>
              )}
              {c.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{optionLabel(INSTITUTION_TYPES, i.type)}</td>
                  <td>
                    <div className="data-table-actions">
                      <button type="button" className="panel-btn panel-btn-sm" onClick={() => setEditing(i)}>
                        Redaktə
                      </button>
                      <button type="button" className="panel-btn panel-btn-sm panel-btn-danger" onClick={() => handleDelete(i)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={c.pageNumber} pageCount={c.pageCount} totalCount={c.totalCount} onChange={c.setPageNumber} />
        </div>
      )}
      {editing && (
        <NameModal
          title={editing === "new" ? "Yeni təhsil ocağı" : "Təhsil ocağını redaktə et"}
          initialName={editing === "new" ? "" : editing.name}
          withType
          initialType={editing === "new" ? 1 : editing.type}
          onClose={() => setEditing(null)}
          onSave={async (name, type) => {
            const body = { name, type: type ?? 1 };
            if (editing === "new") await createInstitution(accessToken, body);
            else await updateInstitution(accessToken, editing.id, body);
            setEditing(null);
            c.reload();
          }}
        />
      )}
    </div>
  );
}

function NameModal({
  title,
  initialName,
  withType,
  initialType,
  onClose,
  onSave,
}: {
  title: string;
  initialName: string;
  withType?: boolean;
  initialType?: number;
  onClose: () => void;
  onSave: (name: string, type?: number) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), withType ? type : undefined);
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="cat-name">Ad</label>
          <input id="cat-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {withType && (
          <div className="form-field">
            <label htmlFor="cat-type">Növ</label>
            <select id="cat-type" value={type} onChange={(e) => setType(Number(e.target.value))}>
              {INSTITUTION_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Yadda saxla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
