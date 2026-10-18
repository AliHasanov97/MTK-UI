"use client";

import { useState, useEffect } from "react";
import {
  APPLICATION_KINDS,
  createApplication,
  createDirectOrder,
  type ApplicationKind,
  type DirectOrderKind,
} from "../../lib/api/hr";
import { getPayrollRunByPeriod } from "../../lib/api/payments";
import { Modal } from "../Modal";
import { DynamicForm, buildBody, missingRequired, type FieldSpec, type FormValues } from "./DynamicForm";
import { APPLICATION_FIELDS, DIRECT_ORDER_FIELDS } from "./documentConfig";
import { hrErrorMessage } from "./shared";

const APPLICATION_KEYS = Object.keys(APPLICATION_KINDS) as ApplicationKind[];
const DIRECT_KEYS = Object.keys(DIRECT_ORDER_FIELDS) as DirectOrderKind[];

const hasEmployee = (specs: FieldSpec[]) => specs.some((s) => s.key === "employeeId");
const withoutEmployee = (specs: FieldSpec[]) => specs.filter((s) => s.key !== "employeeId");

/**
 * Yeni ərizə. `employeeId` verilərsə (işçi kartından), işçi seçimi göstərilmir, ərizə həmin işçi üçün yaradılır
 * və yalnız işçiyə bağlı ərizə növləri təklif olunur.
 */
export function CreateApplicationModal({
  accessToken,
  employeeId,
  onClose,
  onCreated,
}: {
  accessToken: string;
  employeeId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const kinds = employeeId ? APPLICATION_KEYS.filter((k) => hasEmployee(APPLICATION_FIELDS[k])) : APPLICATION_KEYS;
  const [kind, setKind] = useState<ApplicationKind>(kinds.includes("Vacation") ? "Vacation" : kinds[0]);
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const specs = employeeId ? withoutEmployee(APPLICATION_FIELDS[kind]) : APPLICATION_FIELDS[kind];

  // Variant 2: Vacation üçün keçmiş tarix xəbərdarlığı
  const checkPastDateWarning = (startDate: string) => {
    if (!startDate) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(startDate);
    if (selected < today) {
      setWarning("⚠️ Keçmiş tarix seçildi. PayrollRun finalized olunmamış olduğundan əmin olun.");
    } else {
      setWarning(null);
    }
  };

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
      await createApplication(accessToken, kind, {
        ...buildBody(specs, values),
        ...(employeeId ? { employeeId } : {}),
        ...(kind === 'Vacation' || kind === 'VacationCompensation' ?
          { vacationBalanceId: '00000000-0000-0000-0000-000000000000' } :
          {}
        )
      });
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
            {kinds.map((k) => (
              <option key={k} value={k}>
                {APPLICATION_KINDS[k].label}
              </option>
            ))}
          </select>
        </div>

        <DynamicForm
          specs={specs}
          values={values}
          onChange={(key, value) => {
            setValues((prev) => ({ ...prev, [key]: value }));
            // Variant 2: Vacation növü üçün startDate keçmiş tarix yoxlaması
            if (kind === "Vacation" && key === "startDate") {
              checkPastDateWarning(value);
            }
          }}
        />

        {warning && <p className="form-warning" style={{ backgroundColor: "#fff3cd", color: "#856404", padding: "0.75rem", borderRadius: "0.25rem", marginBottom: "1rem" }}>{warning}</p>}
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

/**
 * Yeni əmr (ərizəsiz verilən əmrlər). `employeeId` verilərsə işçi seçimi göstərilmir
 * və yalnız işçiyə bağlı əmr növləri təklif olunur.
 */
export function CreateOrderModal({
  accessToken,
  employeeId,
  onClose,
  onCreated,
}: {
  accessToken: string;
  employeeId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const kinds = employeeId ? DIRECT_KEYS.filter((k) => hasEmployee(DIRECT_ORDER_FIELDS[k].fields)) : DIRECT_KEYS;
  const [kind, setKind] = useState<DirectOrderKind>(kinds.includes("Bonus") ? "Bonus" : kinds[0]);
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const config = DIRECT_ORDER_FIELDS[kind];
  const specs = employeeId ? withoutEmployee(config.fields) : config.fields;

  // Variant 2: Bonus üçün PayrollRun finalized yoxlaması
  useEffect(() => {
    if (kind !== "Bonus") {
      setWarning(null);
      return;
    }
    const month = values.salaryMonth;
    const year = values.salaryYear;
    if (!month || !year) {
      setWarning(null);
      return;
    }

    getPayrollRunByPeriod(accessToken, Number(year), Number(month))
      .then(payrollRun => {
        // Status: Draft=1, Calculated=2, Approved=3, Paid=4
        if (payrollRun.status !== 1) {
          setWarning(`⚠️ ${year}/${month} ayı üçün PayrollRun artıq finalized-dır (status: ${payrollRun.status}). Bonus əlavə edilə bilməz!`);
        } else {
          setWarning(null);
        }
      })
      .catch(() => {
        // PayrollRun yoxdursa problem yoxdur
        setWarning(null);
      });
  }, [accessToken, kind, values.salaryMonth, values.salaryYear]);

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
      await createDirectOrder(accessToken, kind, { ...buildBody(specs, values), ...(employeeId ? { employeeId } : {}) });
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
            {kinds.map((k) => (
              <option key={k} value={k}>
                {DIRECT_ORDER_FIELDS[k].label}
              </option>
            ))}
          </select>
        </div>

        <DynamicForm
          specs={specs}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />

        {warning && <p className="form-warning" style={{ backgroundColor: "#fff3cd", color: "#856404", padding: "0.75rem", borderRadius: "0.25rem", marginBottom: "1rem" }}>{warning}</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || (kind === "Bonus" && !!warning)}>
            {saving ? "Saxlanılır…" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
