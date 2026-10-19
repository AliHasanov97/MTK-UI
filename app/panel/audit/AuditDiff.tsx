// Backend hər dəyişiklikdə bütün sahələrin köhnə və yeni dəyərini JSON kimi yazır
// (DbContext.SaveChanges). Burada yalnız dəyişən sahələr göstərilir.

type Values = Record<string, unknown>;

// Hər dəyişiklikdə avtomatik yenilənən texniki sahələr — tək başına məlumat vermir.
const NOISE_FIELDS = new Set(["UpdatedAt", "SearchVector"]);

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
  return String(value);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

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

  // Yeni qeyd və ya silinmə: yalnız bir tərəf var — boş olmayan sahələr göstərilir.
  if (!before || !after) {
    const single = (after ?? before)!;
    const rows = Object.entries(single).filter(([k, v]) => !NOISE_FIELDS.has(k) && v !== null && v !== "");
    return (
      <>
        <strong>{after ? "Yeni qeydin dəyərləri:" : "Silinmiş qeydin dəyərləri:"}</strong>
        <table className="data-table data-table-nested">
          <tbody>
            {rows.map(([field, value]) => (
              <tr key={field}>
                <td>{field}</td>
                <td>{show(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changed = keys.filter((k) => !same(before[k], after[k]));
  const meaningful = changed.filter((k) => !NOISE_FIELDS.has(k));
  const rows = meaningful.length > 0 ? meaningful : changed;

  if (rows.length === 0) return <p>Dəyişən sahə yoxdur.</p>;

  return (
    <>
      <strong>Dəyişən sahələr ({rows.length}):</strong>
      <table className="data-table data-table-nested">
        <thead>
          <tr>
            <th>Sahə</th>
            <th>Köhnə dəyər</th>
            <th>Yeni dəyər</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((field) => (
            <tr key={field}>
              <td>{field}</td>
              <td>{show(before[field])}</td>
              <td>{show(after[field])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
