// Shared display formatting for report/table dates across the panel.

const pad = (n: number) => String(n).padStart(2, "0");

// "01.10.2026 14:35" — local time, for a real moment (ISO instant: a payment,
// a charge, a ledger entry). Distinct from a plain calendar date (contract
// validity, due date, a date-range filter boundary), which has no time of day
// and should stay date-only.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
