// Backend hər dəyişiklikdə bütün sahələrin köhnə və yeni dəyərini JSON kimi yazır
// (DbContext.SaveChanges). Burada yalnız dəyişən sahələr göstərilir.

"use client";

import { useState } from "react";

type Values = Record<string, unknown>;

// Hər dəyişiklikdə avtomatik yenilənən texniki sahələr — istifadəçiyə heç nə demir, tam gizlədilir.
const NOISE_FIELDS = new Set(["UpdatedAt", "SearchVector"]);

// Yalnız texniki mənanəsi olan sahələr — açıq şəkildə "Texniki məlumatlar" altında göstərilir.
const TECHNICAL_FIELDS = new Set(["Id", "xmin"]);

// Sahə adlarının insan dilinə tərcüməsi. Bilinməyən adlar üçün generik qayda işləyir.
const FIELD_LABELS: Record<string, string> = {
  Amount: "Məbləğ",
  PaidAmount: "Ödənilmiş məbləğ",
  RateAmount: "Tarif məbləği",
  RateType: "Tarif növü",
  Period: "Dövr",
  Status: "Status",
  Description: "Açıqlama",
  IssuedOn: "Verilmə tarixi",
  CreatedAt: "Yaradılma tarixi",
  Name: "Ad",
  Title: "Başlıq",
  Email: "E-poçt",
  Phone: "Telefon",
  Number: "Nömrə",
  Note: "Qeyd",
  Date: "Tarix",
  StartDate: "Başlanğıc tarixi",
  EndDate: "Son tarix",
  Balance: "Balans",
};

// *Id sahələrinin prefiksi üçün obyekt adları (ApartmentId → "Mənzil (ID)").
const ID_PREFIX_LABELS: Record<string, string> = {
  Apartment: "Mənzil",
  Owner: "Sahib",
  Building: "Bina",
  Garage: "Qaraj",
  User: "İstifadəçi",
  Employee: "İşçi",
  Contract: "Müqavilə",
  Charge: "Ödəniş tələbi",
  Rate: "Tarif",
  Payment: "Ödəniş",
  Invoice: "Hesab",
  Section: "Bölmə",
  Floor: "Mərtəbə",
  Parent: "Valdeyn",
};

// GUID kimi görünən dəyərlər adi istifadəçiyə məlumat vermir — texniki bölməyə keçir.
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function parse(json: string | null): Values | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Values) : null;
  } catch {
    return null;
  }
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Bəli" : "Xeyr";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("az-AZ");
  }
  return String(value);
}

function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  if (field.endsWith("Id")) {
    const prefix = field.slice(0, -2);
    const label = ID_PREFIX_LABELS[prefix] ?? FIELD_LABELS[prefix];
    if (label) return `${label} (ID)`;
  }
  return field;
}

/** Sahə "adi" bölmədə göstəriləcək, yoxsa texniki bölməyə keçəcək? */
function isTechnical(field: string, value: unknown): boolean {
  if (TECHNICAL_FIELDS.has(field) || NOISE_FIELDS.has(field)) return true;
  return field.endsWith("Id") && typeof value === "string" && GUID_RE.test(value);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function TechnicalToggle({ rows, columns }: { rows: [string, unknown, unknown?][]; columns: 2 | 3 }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="panel-btn panel-btn-sm"
        style={{ marginTop: 8 }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Texniki məlumatları gizlət" : "Texniki məlumatları göstər"}
      </button>
      {open && (
        <table className="data-table data-table-nested" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Sahə</th>
              {columns === 3 && <th>Əvvəlki dəyər</th>}
              <th>{columns === 3 ? "Yeni dəyər" : "Dəyər"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([field, before, after]) => (
              <tr key={field}>
                <td>{fieldLabel(field)} <small>({field})</small></td>
                {columns === 3 && <td>{show(before)}</td>}
                <td>{show(after ?? before)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function AuditDiff({ oldValues, newValues }: { oldValues: string | null; newValues: string | null }) {
  const before = parse(oldValues);
  const after = parse(newValues);

  // JSON oxunmadısa, ham mətni göstərmək məlumatı itirməkdən yaxşıdır.
  if ((oldValues && !before) || (newValues && !after)) {
    return (
      <>
        {oldValues && <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{oldValues}</pre>}
        {newValues && <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{newValues}</pre>}
      </>
    );
  }

  if (!before && !after) return <p>Əlavə məlumat yoxdur.</p>;

  // Yeni qeyd və ya silinmə: yalnız bir tərəf var.
  if (!before || !after) {
    const single = (after ?? before)!;
    const entries = Object.entries(single).filter(
      ([k, v]) => !NOISE_FIELDS.has(k) && v !== null && v !== "",
    );
    const main = entries.filter(([k, v]) => !isTechnical(k, v));
    const technical = entries.filter(([k, v]) => isTechnical(k, v));
    return (
      <>
        <strong>
          {after
            ? "Bu qeyd ilk dəfə yaradılıb. Əvvəlki dəyər yoxdur."
            : "Bu qeyd silinib. Silinməzdən əvvəlki dəyərlər:"}
        </strong>
        <table className="data-table data-table-nested">
          <tbody>
            {main.map(([field, value]) => (
              <tr key={field}>
                <td>{fieldLabel(field)}</td>
                <td>{show(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {technical.length > 0 && (
          <TechnicalToggle rows={technical.map(([f, v]) => [f, v] as [string, unknown, unknown?])} columns={2} />
        )}
      </>
    );
  }

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changed = keys.filter((k) => !same(before[k], after[k]));
  const meaningful = changed.filter((k) => !NOISE_FIELDS.has(k) && !isTechnical(k, before[k]) && !isTechnical(k, after[k]));
  const technical = changed.filter((k) => NOISE_FIELDS.has(k) || isTechnical(k, before[k]) || isTechnical(k, after[k]));
  const rows = meaningful.length > 0 ? meaningful : changed.filter((k) => !NOISE_FIELDS.has(k));

  if (rows.length === 0 && technical.length === 0) return <p>Dəyişən sahə yoxdur.</p>;

  return (
    <>
      {rows.length > 0 && (
        <>
          <strong>Dəyişən sahələr ({rows.length}):</strong>
          <table className="data-table data-table-nested">
            <thead>
              <tr>
                <th>Sahə</th>
                <th>Əvvəlki dəyər</th>
                <th>Yeni dəyər</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((field) => (
                <tr key={field}>
                  <td>{fieldLabel(field)}</td>
                  <td>{show(before[field])}</td>
                  <td>{show(after[field])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {technical.length > 0 && (
        <TechnicalToggle
          rows={technical.map((f) => [f, before[f], after[f]] as [string, unknown, unknown?])}
          columns={3}
        />
      )}
    </>
  );
}
