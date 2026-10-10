"use client";

import { useState } from "react";
import {
  APPLICATION_KINDS,
  createApplication,
  createDirectOrder,
  type ApplicationKind,
  type DirectOrderKind,
} from "../../lib/api/hr";
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

  const specs = employeeId ? withoutEmployee(APPLICATION_FIELDS[kind]) : APPLICATION_FIELDS[kind];

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
      await createApplication(accessToken, kind, { ...buildBody(specs, values), ...(employeeId ? { employeeId } : {}) });
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

  const config = DIRECT_ORDER_FIELDS[kind];
  const specs = employeeId ? withoutEmployee(config.fields) : config.fields;

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
