"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType, SortDirection, type QueryFilter } from "../../../lib/api/buildings";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  createEmployee,
  deleteEmployee,
  optionLabel,
  searchEmployees,
  type EmployeeForm,
  type EmployeeListItem,
} from "../../../lib/api/hr";
import { ColumnFilter, SortIcon } from "../../ColumnFilter";
import { Modal } from "../../Modal";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, formatDate, fullName, hrErrorMessage } from "../shared";
import { emptyEmployeeForm } from "./EmployeeForm";
import { EmployeeFormFields } from "./EmployeeSections";

// Filtr siyahılarını doldurmaq üçün bir dəfə süzgəcsiz yüklənən işçi sayı (cədvəl öz səhifələnmiş sorğusunu işlədir)
const FILTER_SOURCE_SIZE = 1000;

type SortColumn = "RegisterNumber" | "Surname" | "FinCode" | "StartWorkDate";

const initials = (e: { surname: string; name: string }) =>
  `${e.surname?.[0] ?? ""}${e.name?.[0] ?? ""}`.toLocaleUpperCase("az");

/** İşə başlama tarixindən bu günə qədər olan müddət, məs. "2 il 3 ay" */
function tenure(startIso: string): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "1 aydan az";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} il` : "", m ? `${m} ay` : ""].filter(Boolean).join(" ");
}

export function IscilerView() {
  const auth = useAuth();
  const [items, setItems] = useState<EmployeeListItem[] | null>(null);
  const [source, setSource] = useState<EmployeeListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([]);
  const [finFilter, setFinFilter] = useState<string[]>([]);
  const [jobFilter, setJobFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<number[]>([]);
  const [sort, setSort] = useState<{ column: SortColumn; direction: "asc" | "desc" }>({
    column: "RegisterNumber",
    direction: "asc",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Hər hansı süzgəc / axtarış / çeşidləmə dəyişəndə cari səhifə etibarsız olur
  const filterSignature = JSON.stringify([searchTerm, employeeFilter, finFilter, jobFilter, typeFilter, statusFilter, sort]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  // Filtr siyahıları üçün bütün işçilər (süzgəcsiz)
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchEmployees(auth.accessToken, { page: 0, pageSize: FILTER_SOURCE_SIZE })
      .then((res) => setSource(res.data))
      .catch(() => {
        /* filtr siyahıları əlavə imkandır; əsas cədvəl öz xətasını göstərir */
      });
  }, [auth, reloadKey]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const filters: QueryFilter[] = [];
    if (employeeFilter.length) filters.push({ columnName: "Id", comparison: QueryComparisonType.In, value: employeeFilter });
    if (finFilter.length) filters.push({ columnName: "FinCode", comparison: QueryComparisonType.In, value: finFilter });
    if (jobFilter.length) filters.push({ columnName: "JobId", comparison: QueryComparisonType.In, value: jobFilter });
    if (typeFilter.length) filters.push({ columnName: "EmploymentType", comparison: QueryComparisonType.In, value: typeFilter });
    if (statusFilter.length) filters.push({ columnName: "IsActive", comparison: QueryComparisonType.In, value: statusFilter });

    searchEmployees(auth.accessToken, {
      filters: filters.length ? filters : null,
      searchTerm: searchTerm || undefined,
      sortCriteria: {
        columnName: sort.column,
        direction: sort.direction === "asc" ? SortDirection.Ascending : SortDirection.Descending,
      },
      // Backend-in `page` parametri sıfırdan başlayan səhifə nömrəsidir
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
  }, [auth, searchTerm, employeeFilter, finFilter, jobFilter, typeFilter, statusFilter, sort, pageNumber, reloadKey]);

  const employeeOptions = useMemo(
    () =>
      [...source]
        .sort((a, b) => fullName(a).localeCompare(fullName(b), "az"))
        .map((e) => ({ value: e.id, label: fullName(e) })),
    [source],
  );
  const finOptions = useMemo(
    () =>
      [...new Set(source.map((e) => e.finCode).filter((v): v is string => Boolean(v)))]
        .sort()
        .map((v) => ({ value: v, label: v })),
    [source],
  );
  const jobOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const e of source) if (e.job) byId.set(e.job.id, e.job.name);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], "az")).map(([value, label]) => ({ value, label }));
  }, [source]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev.column === column ? { column, direction: prev.direction === "asc" ? "desc" : "asc" } : { column, direction: "asc" },
    );
  }

  async function handleDelete(employee: EmployeeListItem) {
    if (!window.confirm(`${fullName(employee)} silinsin?`)) return;
    setWorkingId(employee.id);
    setError(null);
    try {
      await deleteEmployee(accessToken, employee.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  const activeFilterCount = [employeeFilter, finFilter, jobFilter, typeFilter, statusFilter].filter((f) => f.length > 0).length;

  function clearFilters() {
    setEmployeeFilter([]);
    setFinFilter([]);
    setJobFilter([]);
    setTypeFilter([]);
    setStatusFilter([]);
    setSearchInput("");
  }

  if (error && !items) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  const sortIcon = (column: SortColumn) => <SortIcon active={sort.column === column} direction={sort.direction} />;

  return (
    <div>
      <div className="em-toolbar">
        <input
          type="search"
          className="em-search"
          placeholder="Ad, soyad və ya ata adı üzrə axtar…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {(activeFilterCount > 0 || searchTerm) && (
          <button type="button" className="panel-btn panel-btn-sm" onClick={clearFilters}>
            Filtrləri təmizlə{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        )}
        <button type="button" className="panel-btn panel-btn-primary em-add" onClick={() => setShowCreate(true)}>
          + Yeni işçi
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
        <div className="em-table-wrap">
          <div className="em-table-scroll">
            <table className="em-table">
              <thead>
                <tr>
                  <th className="em-col-no">
                    <div className="th-row">
                      <span className="th-label" onClick={() => handleSort("RegisterNumber")}>
                        № {sortIcon("RegisterNumber")}
                      </span>
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      <span className="th-label" onClick={() => handleSort("Surname")}>
                        İşçi {sortIcon("Surname")}
                      </span>
                      <ColumnFilter options={employeeOptions} selected={employeeFilter} onChange={setEmployeeFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      <span className="th-label">Vəzifə</span>
                      <ColumnFilter options={jobOptions} selected={jobFilter} onChange={setJobFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      <span className="th-label" onClick={() => handleSort("FinCode")}>
                        FİN {sortIcon("FinCode")}
                      </span>
                      <ColumnFilter options={finOptions} selected={finFilter} onChange={setFinFilter} />
                    </div>
                  </th>
                  <th>Telefon</th>
                  <th>
                    <div className="th-row">
                      <span className="th-label">İş rejimi</span>
                      <ColumnFilter
                        options={EMPLOYMENT_TYPES.map((o) => ({ value: o.value, label: o.label }))}
                        selected={typeFilter}
                        onChange={setTypeFilter}
                      />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      <span className="th-label" onClick={() => handleSort("StartWorkDate")}>
                        İşə başlama {sortIcon("StartWorkDate")}
                      </span>
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      <span className="th-label">Status</span>
                      <ColumnFilter
                        options={EMPLOYEE_STATUSES.map((o) => ({ value: o.value, label: o.label }))}
                        selected={statusFilter}
                        onChange={setStatusFilter}
                      />
                    </div>
                  </th>
                  <th aria-label="Əməliyyatlar" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="em-empty">
                      <strong>{activeFilterCount > 0 || searchTerm ? "Nəticə tapılmadı" : "Hələ işçi yoxdur"}</strong>
                      <span>
                        {activeFilterCount > 0 || searchTerm
                          ? "Axtarışı və ya filtrləri dəyişin."
                          : "İlk işçini əlavə etmək üçün “+ Yeni işçi” düyməsindən istifadə edin."}
                      </span>
                    </td>
                  </tr>
                )}
                {items.map((e) => {
                  const active = e.isActive === 1;
                  return (
                    <tr key={e.id} className={active ? "" : "em-row-off"}>
                      <td className="em-col-no">{e.registerNumber}</td>
                      <td>
                        <div className="em-person">
                          <span className={`em-avatar ${e.gender === 2 ? "em-avatar-f" : ""}`}>{initials(e)}</span>
                          <Link className="em-name" href={`/panel/hr/isciler/${e.id}`}>
                            {fullName(e)}
                          </Link>
                        </div>
                      </td>
                      <td>{e.job?.name ?? "—"}</td>
                      <td>{e.finCode ?? "—"}</td>
                      <td>{e.phoneNumber ?? "—"}</td>
                      <td>{optionLabel(EMPLOYMENT_TYPES, e.employmentType)}</td>
                      <td>
                        {formatDate(e.startWorkDate)}
                        <small className="em-sub">{tenure(e.startWorkDate)}</small>
                      </td>
                      <td>
                        <span className={`panel-role-tag ${active ? "panel-role-tag-good" : "panel-role-tag-bad"}`}>
                          {optionLabel(EMPLOYEE_STATUSES, e.isActive)}
                        </span>
                      </td>
                      <td>
                        <div className="em-actions">
                          <Link className="panel-btn panel-btn-sm" href={`/panel/hr/isciler/${e.id}`}>
                            Aç
                          </Link>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            disabled={workingId === e.id}
                            onClick={() => handleDelete(e)}
                          >
                            Sil
                          </button>
                        </div>
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
        <CreateEmployeeModal
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

function CreateEmployeeModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.jobId) {
      setError("Vəzifə seçilməlidir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEmployee(accessToken, form);
      onCreated();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni işçi" wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <EmployeeFormFields form={form} setForm={setForm} />
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
