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

/** Ad üzrə axtarış, səhifələmə və yükləmə vəziyyəti olan sadə lüğət siyahısı. */
function useCatalog<T extends { id: string }>(
  load: (token: string, params: { searchTerm?: string; page: number; pageSize: number }) => Promise<{
    data: T[];
    totalCount: number;
    pageCount: number;
  }>,
) {
  const auth = useAuth();
  const [items, setItems] = useState<T[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
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
    // `load` modul səviyyəsində sabit funksiyadır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, searchTerm, pageNumber, reloadKey]);

  return {
    items,
    totalCount,
    pageCount,
    error,
    setError,
    searchInput,
    setSearchInput,
    searchTerm,
    pageNumber,
    setPageNumber,
    reload: () => setReloadKey((k) => k + 1),
  };
}

const loadJobs = (token: string, p: { searchTerm?: string; page: number; pageSize: number }) =>
  searchJobs(token, { ...p, sortCriteria: { columnName: "Name", direction: 0 } });
const loadInstitutions = (token: string, p: { searchTerm?: string; page: number; pageSize: number }) =>
  searchInstitutions(token, { ...p, sortCriteria: { columnName: "Name", direction: 0 } });

const SECTIONS: { key: Section; title: string; hint: string; icon: string }[] = [
  { key: "jobs", title: "Vəzifələr", hint: "İşçi kartı, ərizə və əmrlərdə seçilən vəzifələr", icon: "◈" },
  { key: "institutions", title: "Təhsil ocaqları", hint: "Universitet və kolleclər — işçinin təhsil qeydləri üçün", icon: "◎" },
];

export function LugetlerView() {
  const auth = useAuth();
  const [section, setSection] = useState<Section>("jobs");
  const jobs = useCatalog<Job>(loadJobs);
  const institutions = useCatalog<EducationalInstitution>(loadInstitutions);
  const [editingJob, setEditingJob] = useState<Job | "new" | null>(null);
  const [editingInst, setEditingInst] = useState<EducationalInstitution | "new" | null>(null);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  const counts: Record<Section, number | null> = {
    jobs: jobs.searchTerm ? null : jobs.totalCount,
    institutions: institutions.searchTerm ? null : institutions.totalCount,
  };
  const active = SECTIONS.find((s) => s.key === section)!;
  const c = section === "jobs" ? jobs : institutions;

  async function handleDeleteJob(job: Job) {
    if (!window.confirm(`"${job.name}" vəzifəsi silinsin?`)) return;
    try {
      await deleteJob(accessToken, job.id);
      jobs.reload();
    } catch (err) {
      jobs.setError(hrErrorMessage(err));
    }
  }

  async function handleDeleteInstitution(item: EducationalInstitution) {
    if (!window.confirm(`"${item.name}" silinsin?`)) return;
    try {
      await deleteInstitution(accessToken, item.id);
      institutions.reload();
    } catch (err) {
      institutions.setError(hrErrorMessage(err));
    }
  }

  return (
    <div className="lg-layout">
      <nav className="lg-nav" aria-label="Lüğətlər">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`lg-nav-item ${section === s.key ? "active" : ""}`}
            aria-current={section === s.key}
            onClick={() => setSection(s.key)}
          >
            <span className="lg-nav-icon">{s.icon}</span>
            <span className="lg-nav-text">
              <strong>{s.title}</strong>
              <small>{s.hint}</small>
            </span>
            {counts[s.key] !== null && <span className="lg-count">{counts[s.key]}</span>}
          </button>
        ))}
      </nav>

      <section className="lg-panel">
        <header className="lg-panel-head">
          <div>
            <h2>{active.title}</h2>
            <p>{active.hint}</p>
          </div>
          <button
            type="button"
            className="panel-btn panel-btn-primary"
            onClick={() => (section === "jobs" ? setEditingJob("new") : setEditingInst("new"))}
          >
            + {section === "jobs" ? "Yeni vəzifə" : "Yeni təhsil ocağı"}
          </button>
        </header>

        <div className="lg-search">
          <input
            type="search"
            placeholder={section === "jobs" ? "Vəzifə axtar…" : "Təhsil ocağı axtar…"}
            value={c.searchInput}
            onChange={(e) => c.setSearchInput(e.target.value)}
          />
          {c.totalCount !== null && c.searchTerm && <span className="lg-found">{c.totalCount} nəticə</span>}
        </div>

        {c.error && (
          <p className="ledger-alert" role="alert">
            {c.error}
          </p>
        )}

        {!c.items ? (
          <p className="panel-page-lead">Yüklənir…</p>
        ) : c.items.length === 0 ? (
          <div className="hr-empty">
            <strong>{c.searchTerm ? "Nəticə tapılmadı" : `${active.title} siyahısı boşdur`}</strong>
            <span>{c.searchTerm ? "Axtarış sözünü dəyişin." : "İlk qeydi əlavə etmək üçün yuxarıdakı düymədən istifadə edin."}</span>
          </div>
        ) : (
          <ul className="lg-list">
            {section === "jobs"
              ? jobs.items!.map((j) => (
                  <li key={j.id} className="lg-row">
                    <span className="lg-avatar">{initial(j.name)}</span>
                    <span className="lg-name">{j.name}</span>
                    <RowActions onEdit={() => setEditingJob(j)} onDelete={() => handleDeleteJob(j)} />
                  </li>
                ))
              : institutions.items!.map((i) => (
                  <li key={i.id} className="lg-row">
                    <span className="lg-avatar lg-avatar-alt">{initial(i.name)}</span>
                    <span className="lg-name">{i.name}</span>
                    <span className="panel-role-tag">{optionLabel(INSTITUTION_TYPES, i.type)}</span>
                    <RowActions onEdit={() => setEditingInst(i)} onDelete={() => handleDeleteInstitution(i)} />
                  </li>
                ))}
          </ul>
        )}

        {c.items && c.items.length > 0 && (
          <Pagination page={c.pageNumber} pageCount={c.pageCount} totalCount={c.totalCount ?? 0} onChange={c.setPageNumber} />
        )}
      </section>

      {editingJob && (
        <CatalogModal
          title={editingJob === "new" ? "Yeni vəzifə" : "Vəzifəni redaktə et"}
          nameLabel="Vəzifənin adı"
          initialName={editingJob === "new" ? "" : editingJob.name}
          onClose={() => setEditingJob(null)}
          onSave={async (name) => {
            if (editingJob === "new") await createJob(accessToken, name);
            else await updateJob(accessToken, editingJob.id, name);
            setEditingJob(null);
            jobs.reload();
          }}
        />
      )}
      {editingInst && (
        <CatalogModal
          title={editingInst === "new" ? "Yeni təhsil ocağı" : "Təhsil ocağını redaktə et"}
          nameLabel="Təhsil ocağının adı"
          initialName={editingInst === "new" ? "" : editingInst.name}
          withType
          initialType={editingInst === "new" ? 1 : editingInst.type}
          onClose={() => setEditingInst(null)}
          onSave={async (name, type) => {
            const body = { name, type: type ?? 1 };
            if (editingInst === "new") await createInstitution(accessToken, body);
            else await updateInstitution(accessToken, editingInst.id, body);
            setEditingInst(null);
            institutions.reload();
          }}
        />
      )}
    </div>
  );
}

const initial = (name: string) => (name.trim()[0] ?? "?").toLocaleUpperCase("az");

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="lg-actions">
      <button type="button" className="panel-btn panel-btn-sm" onClick={onEdit}>
        Redaktə
      </button>
      <button type="button" className="panel-btn panel-btn-sm panel-btn-danger" onClick={onDelete}>
        Sil
      </button>
    </span>
  );
}

function CatalogModal({
  title,
  nameLabel,
  initialName,
  withType,
  initialType,
  onClose,
  onSave,
}: {
  title: string;
  nameLabel: string;
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
          <label htmlFor="cat-name">{nameLabel}</label>
          <input id="cat-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {withType && (
          <div className="form-field">
            <span className="cal-label">Növ</span>
            <div className="cal-sched" role="radiogroup" aria-label="Növ">
              {INSTITUTION_TYPES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={type === o.value}
                  className={type === o.value ? "active" : ""}
                  onClick={() => setType(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Saxlanılır…" : "Yadda saxla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
