"use client";

import type { FieldSpec } from "./mockData";

export function DynamicFields({
  specs,
  values,
  onChange,
}: {
  specs: FieldSpec[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {specs.map((spec) => (
        <div className="form-field" key={spec.key}>
          <label htmlFor={spec.key}>{spec.label}</label>
          {spec.kind === "select" ? (
            <select
              id={spec.key}
              value={values[spec.key] ?? ""}
              onChange={(e) => onChange(spec.key, e.target.value)}
              required
            >
              <option value="">Seçin…</option>
              {spec.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={spec.key}
              type={spec.kind === "date" ? "date" : spec.kind === "number" ? "number" : "text"}
              value={values[spec.key] ?? ""}
              onChange={(e) => onChange(spec.key, e.target.value)}
              required
            />
          )}
        </div>
      ))}
    </>
  );
}
