"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { QueryComparisonType } from "../../lib/api/buildings";
import {
  searchEmployees,
  searchInstitutions,
  searchJobs,
  type EducationalInstitution,
  type EmployeeListItem,
  type Job,
} from "../../lib/api/hr";
import { SearchableSelect } from "../SearchableSelect";
import { fullName, hrErrorMessage } from "./shared";

const PICKER_PAGE_SIZE = 200;

function useLoaded<T>(load: (token: string) => Promise<T[]>) {
  const auth = useAuth();
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    let cancelled = false;
    load(auth.accessToken)
      .then((res) => !cancelled && setItems(res))
      .catch((err) => !cancelled && setError(hrErrorMessage(err)));
    return () => {
      cancelled = true;
    };
    // `load` is a stable module-level function per picker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  return { items, error };
}

const loadActiveEmployees = (token: string) =>
  searchEmployees(token, {
    filters: [{ columnName: "IsActive", comparison: QueryComparisonType.Equals, value: 1 }],
    sortCriteria: { columnName: "Surname", direction: 0 },
    pageSize: PICKER_PAGE_SIZE,
  }).then((r) => r.data);

/** Aktiv işçilər arasından seçim. */
export function EmployeePicker({
  value,
  onChange,
  placeholder = "İşçi seçin…",
}: {
  value: string;
  onChange: (employeeId: string) => void;
  placeholder?: string;
}) {
  const { items, error } = useLoaded<EmployeeListItem>(loadActiveEmployees);
  if (error) return <p className="form-error">{error}</p>;
  if (!items) return <p className="panel-page-lead">Yüklənir…</p>;
  return (
    <SearchableSelect
      options={items.map((e) => ({ value: e.id, label: fullName(e), sublabel: e.job?.name }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

const loadJobs = (token: string) =>
  searchJobs(token, { sortCriteria: { columnName: "Name", direction: 0 }, pageSize: PICKER_PAGE_SIZE }).then((r) => r.data);

export function JobPicker({ value, onChange }: { value: string; onChange: (jobId: string) => void }) {
  const { items, error } = useLoaded<Job>(loadJobs);
  if (error) return <p className="form-error">{error}</p>;
  if (!items) return <p className="panel-page-lead">Yüklənir…</p>;
  return (
    <SearchableSelect
      options={items.map((j) => ({ value: j.id, label: j.name }))}
      value={value}
      onChange={onChange}
      placeholder="Vəzifə seçin…"
    />
  );
}

const loadInstitutions = (token: string) =>
  searchInstitutions(token, { sortCriteria: { columnName: "Name", direction: 0 }, pageSize: PICKER_PAGE_SIZE }).then(
    (r) => r.data,
  );

export function InstitutionPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { items, error } = useLoaded<EducationalInstitution>(loadInstitutions);
  if (error) return <p className="form-error">{error}</p>;
  if (!items) return <p className="panel-page-lead">Yüklənir…</p>;
  return (
    <SearchableSelect
      options={items.map((i) => ({ value: i.id, label: i.name }))}
      value={value}
      onChange={onChange}
      placeholder="Təhsil ocağı seçin…"
    />
  );
}
