"use client";

import {
  CALENDAR_DAY_TYPES,
  DISCIPLINARY_TYPES,
  EMPLOYMENT_TYPES,
  GENDERS,
  toIso,
  type Option,
} from "../../lib/api/hr";
import { EmployeePicker, JobPicker } from "./Pickers";

export type FieldSpec = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "number" | "date" | "select" | "employee" | "job";
  required?: boolean;
  options?: Option[];
  /** DateTimeOffset sahələri UTC ISO kimi, DateOnly sahələri "yyyy-MM-dd" kimi göndərilir. */
  dateOnly?: boolean;
  hint?: string;
  min?: number;
  max?: number;
};

export const SELECT_OPTIONS = { GENDERS, EMPLOYMENT_TYPES, DISCIPLINARY_TYPES, CALENDAR_DAY_TYPES };

export type FormValues = Record<string, string>;

/** Doldurulmuş formu API gövdəsinə çevirir: boş sahə göndərilmir, tarix/rəqəm uyğun tipə salınır. */
export function buildBody(specs: FieldSpec[], values: FormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const spec of specs) {
    const raw = (values[spec.key] ?? "").trim();
    if (raw === "") continue;
    if (spec.kind === "number" || spec.kind === "select") {
      body[spec.key] = Number(raw);
    } else if (spec.kind === "date") {
      body[spec.key] = spec.dateOnly ? raw : toIso(raw);
    } else {
      body[spec.key] = raw;
    }
  }
  return body;
}

/** Məcburi sahə boş qalıbsa, istifadəçiyə göstəriləcək mesaj. */
export function missingRequired(specs: FieldSpec[], values: FormValues): string | null {
  const missing = specs.find((s) => s.required && (values[s.key] ?? "").trim() === "");
  return missing ? `"${missing.label}" sahəsi doldurulmalıdır.` : null;
}

export function DynamicForm({
  specs,
  values,
  onChange,
}: {
  specs: FieldSpec[];
  values: FormValues;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {specs.map((spec) => {
        const id = `dyn-${spec.key}`;
        const value = values[spec.key] ?? "";
        return (
          <div className="form-field" key={spec.key}>
            <label htmlFor={id}>
              {spec.label}
              {spec.required ? " *" : ""}
            </label>
            {spec.kind === "employee" ? (
              <EmployeePicker value={value} onChange={(v) => onChange(spec.key, v)} />
            ) : spec.kind === "job" ? (
              <JobPicker value={value} onChange={(v) => onChange(spec.key, v)} />
            ) : spec.kind === "select" ? (
              <select id={id} value={value} onChange={(e) => onChange(spec.key, e.target.value)}>
                <option value="">Seçin…</option>
                {spec.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : spec.kind === "textarea" ? (
              <textarea id={id} rows={3} value={value} onChange={(e) => onChange(spec.key, e.target.value)} />
            ) : (
              <input
                id={id}
                type={spec.kind === "date" ? "date" : spec.kind === "number" ? "number" : "text"}
                min={spec.min}
                max={spec.max}
                value={value}
                onChange={(e) => onChange(spec.key, e.target.value)}
              />
            )}
            {spec.hint && <span className="vendor-cell-sub">{spec.hint}</span>}
          </div>
        );
      })}
    </>
  );
}
