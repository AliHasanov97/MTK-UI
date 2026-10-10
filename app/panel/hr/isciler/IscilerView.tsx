"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../../lib/api/buildings";
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
import { Modal } from "../../Modal";
import { Pagination } from "../Pagination";
import { PAGE_SIZE, formatDate, fullName, hrErrorMessage } from "../shared";
import { emptyEmployeeForm } from "./EmployeeForm";
import { EmployeeFormFields } from "./EmployeeSections";

export function IscilerView() {
  const auth = useAuth();
  const [items, setItems] = useState<EmployeeListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterSignature = JSON.stringify([searchTerm, statusFilter]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchEmployees(auth.accessToken, {
      filters: statusFilter
        ? [{ columnName: "IsActive", comparison: QueryComparisonType.Equals, value: Number(statusFilter) }]
        : null,
      searchTerm: searchTerm || undefined,
      sortCriteria: { columnName: "RegisterNumber", direction: 0 },
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
  }, [auth, searchTerm, statusFilter, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

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
        <input
          className="panel-search"
          placeholder="Axtar (ad, soyad, FİN…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select className="panel-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Bütün statuslar</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowCreate(true)}
        >
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
        <div className="data-table-wrap">
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Soyad, ad, ata adı</th>
                  <th>FİN</th>
                  <th>Vəzifə</th>
                  <th>İş rejimi</th>
                  <th>İşə başlama</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {items.map((e) => (
                  <tr key={e.id}>
                    <td>{e.registerNumber}</td>
                    <td className="vendor-cell-vendor">
                      <Link className="owner-link" href={`/panel/hr/isciler/${e.id}`}>
                        {fullName(e)}
                      </Link>
                      {e.phoneNumber && <span className="vendor-cell-sub">{e.phoneNumber}</span>}
                    </td>
                    <td>{e.finCode ?? "—"}</td>
                    <td>{e.job?.name ?? "—"}</td>
                    <td>{optionLabel(EMPLOYMENT_TYPES, e.employmentType)}</td>
                    <td>{formatDate(e.startWorkDate)}</td>
                    <td>
                      <span
                        className={`panel-role-tag ${e.isActive === 1 ? "panel-role-tag-good" : "panel-role-tag-bad"}`}
                      >
                        {optionLabel(EMPLOYEE_STATUSES, e.isActive)}
                      </span>
                    </td>
                    <td>
                      <div className="data-table-actions">
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
                ))}
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
