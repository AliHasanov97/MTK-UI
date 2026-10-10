"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import {
  CALENDAR_DAY_TYPES,
  bulkCreateCalendarDays,
  createCalendarDay,
  deleteCalendarDay,
  getCalendarYear,
  toDateInput,
  updateCalendarDay,
  type BulkCalendarDayItem,
  type CalendarDay,
  type CalendarDayForm,
  type CalendarMonth,
  type CalendarYear,
} from "../../../lib/api/hr";
import { Modal } from "../../Modal";
import { formatDate, hrErrorMessage } from "../shared";

const SCHEDULES = [
  { value: 1, label: "5 günlük" },
  { value: 2, label: "6 günlük" },
];

const SCHEDULE_CHOICES = [{ value: "", label: "Hamıya" }, ...SCHEDULES.map((s) => ({ value: String(s.value), label: `Yalnız ${s.label}` }))];

const TYPE_INFO: Record<number, { label: string; hint: string; cls: string }> = {
  1: { label: "Bayram", hint: "Bayram və ya hüzn günü — qeyri-iş günü", cls: "cal-holiday" },
  2: { label: "İş günü", hint: "İstirahət gününün əvəzinə işlənən gün", cls: "cal-work" },
  3: { label: "Qeyri-iş günü", hint: "Əlavə istirahət günü", cls: "cal-off" },
};

const WEEKDAYS = ["B.e", "Ç.a", "Çər", "C.a", "Cüm", "Şən", "Baz"];
const pad = (n: number) => String(n).padStart(2, "0");

type EditTarget = { day: CalendarDay | null; date?: string };

export function TeqvimView() {
  const auth = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [schedule, setSchedule] = useState(1);
  const [sheets, setSheets] = useState<Record<number, CalendarYear> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [bulk, setBulk] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([getCalendarYear(auth.accessToken, year, 1), getCalendarYear(auth.accessToken, year, 2)])
      .then(([five, six]) => {
        setSheets({ 1: five, 2: six });
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [auth, year, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;
  const data = sheets?.[schedule] ?? null;

  function changeYear(delta: number) {
    setSheets(null);
    setYear((y) => y + delta);
  }

  async function handleDelete(day: CalendarDay) {
    if (!window.confirm(`${formatDate(day.date)} — "${day.name}" silinsin?`)) return;
    try {
      await deleteCalendarDay(accessToken, day.id);
      setEditing(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(hrErrorMessage(err));
    }
  }

  const entryCount = data ? data.months.reduce((n, m) => n + m.days.length, 0) : 0;

  return (
    <div>
      <div className="cal-toolbar">
        <div className="cal-year">
          <button type="button" aria-label="Əvvəlki il" onClick={() => changeYear(-1)}>
            ‹
          </button>
          <strong>{year}</strong>
          <button type="button" aria-label="Növbəti il" onClick={() => changeYear(1)}>
            ›
          </button>
        </div>
        <div className="ledger-segmented" role="tablist" aria-label="İş həftəsi">
          {SCHEDULES.map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={schedule === o.value}
              className={schedule === o.value ? "active" : ""}
              onClick={() => setSchedule(o.value)}
            >
              {o.label} iş həftəsi
            </button>
          ))}
        </div>
        <div className="cal-actions">
          <button type="button" className="panel-btn" onClick={() => setBulk(true)}>
            Toplu əlavə et
          </button>
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setEditing({ day: null })}>
            + Gün əlavə et
          </button>
        </div>
      </div>

      {notice && (
        <div className="cal-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Bağla" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}
      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!data || !sheets ? (
        !error && <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <>
          <div className="tb-summary">
            <div className="tb-summary-item">
              <strong>{data.yearTotal.workingDays}</strong>
              <span>İş günü</span>
            </div>
            <div className="tb-summary-item">
              <strong>{data.yearTotal.nonWorkingDays}</strong>
              <span>Qeyri-iş günü</span>
            </div>
            <div className="tb-summary-item">
              <strong>{entryCount}</strong>
              <span>Qeyd olunmuş gün</span>
            </div>
            <div className="tb-summary-item">
              <strong>
                {sheets[1].yearTotal.workingDays} / {sheets[2].yearTotal.workingDays}
              </strong>
              <span>İş günü: 5 / 6 günlük</span>
            </div>
          </div>

          <div className="cal-legend">
            <span><i className="cal-dot" style={{ background: "#fde3e3" }} /> Bayram</span>
            <span><i className="cal-dot" style={{ background: "#e1f2d3" }} /> Əvəz iş günü</span>
            <span><i className="cal-dot" style={{ background: "#e6e9e4" }} /> Qeyri-iş günü (qeyd)</span>
            <span><i className="cal-dot" style={{ background: "#fdf1e7" }} /> Həftə sonu</span>
            <span>Gün üzərinə klikləyərək əlavə edin və ya redaktə edin</span>
          </div>

          <div className="cal-grid">
            {data.months.map((m) => (
              <MonthCard
                key={m.month}
                year={data.year}
                month={m}
                schedule={schedule}
                onPick={(date, day) => setEditing({ day, date })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {editing && (
        <CalendarDayModal
          accessToken={accessToken}
          target={editing}
          year={year}
          defaultSchedule=""
          onClose={() => setEditing(null)}
          onDelete={handleDelete}
          onSaved={() => {
            setEditing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {bulk && (
        <BulkModal
          accessToken={accessToken}
          year={year}
          onClose={() => setBulk(false)}
          onSaved={(msg) => {
            setBulk(false);
            setNotice(msg);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Ay kartı ------------------------------ */

function MonthCard({
  year,
  month,
  schedule,
  onPick,
  onDelete,
}: {
  year: number;
  month: CalendarMonth;
  schedule: number;
  onPick: (date: string, day: CalendarDay | null) => void;
  onDelete: (day: CalendarDay) => void;
}) {
  const byDate = new Map(month.days.map((d) => [toDateInput(d.date), d]));
  const daysInMonth = new Date(year, month.month, 0).getDate();
  const offset = (new Date(year, month.month - 1, 1).getDay() + 6) % 7; // həftə bazar ertəsi başlayır
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="cal-month">
      <div className="cal-month-head">
        <h4>{month.monthName}</h4>
        <span>
          <b>{month.workingDays}</b> iş günü · {month.nonWorkingDays} qeyri-iş
        </span>
      </div>
      <div className="cal-days">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-wd ${i >= 5 ? "cal-we" : ""}`}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} className="cal-day cal-empty" />;
          const key = `${year}-${pad(month.month)}-${pad(d)}`;
          const entry = byDate.get(key);
          const weekday = (offset + d - 1) % 7; // 5 = şənbə, 6 = bazar
          const weekend = weekday === 6 || (weekday === 5 && schedule === 1);
          const cls = entry ? TYPE_INFO[entry.dayType]?.cls ?? "" : weekend ? "cal-weekend" : "";
          return (
            <button
              key={key}
              type="button"
              className={`cal-day ${cls} ${key === todayKey ? "cal-today" : ""}`}
              title={entry ? `${entry.name} · ${TYPE_INFO[entry.dayType]?.label ?? ""}` : undefined}
              onClick={() => onPick(key, entry ?? null)}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="cal-entries">
        {month.days.length === 0 && <span className="cal-none">Qeyd yoxdur</span>}
        {month.days.map((d) => (
          <div key={d.id} className="cal-entry">
            <span className="cal-entry-date">{formatDate(d.date).slice(0, 5)}</span>
            <span className="cal-entry-name" title={d.name}>
              {d.name}
            </span>
            <span className={`cal-tag ${TYPE_INFO[d.dayType]?.cls ?? ""}`}>{TYPE_INFO[d.dayType]?.label}</span>
            {d.applicableWorkingDays && <span className="cal-tag cal-sched">{d.applicableWorkingDays === 1 ? "5" : "6"} gün</span>}
            <button type="button" className="cal-icon-btn" aria-label="Redaktə et" onClick={() => onPick(toDateInput(d.date), d)}>
              ✎
            </button>
            <button type="button" className="cal-icon-btn danger" aria-label="Sil" onClick={() => onDelete(d)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Ortaq seçimlər ------------------------------ */

function TypePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="cal-types" role="radiogroup" aria-label="Gün növü">
      {CALENDAR_DAY_TYPES.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`cal-type t${o.value} ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          <strong>{TYPE_INFO[o.value]?.label ?? o.label}</strong>
          <small>{TYPE_INFO[o.value]?.hint}</small>
        </button>
      ))}
    </div>
  );
}

function SchedulePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="cal-sched" role="radiogroup" aria-label="İş qrafiki">
      {SCHEDULE_CHOICES.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Tək gün ------------------------------ */

function CalendarDayModal({
  accessToken,
  target,
  year,
  defaultSchedule,
  onClose,
  onDelete,
  onSaved,
}: {
  accessToken: string;
  target: EditTarget;
  year: number;
  defaultSchedule: string;
  onClose: () => void;
  onDelete: (day: CalendarDay) => void;
  onSaved: () => void;
}) {
  const day = target.day;
  const [form, setForm] = useState<CalendarDayForm>({
    name: day?.name ?? "",
    date: day ? toDateInput(day.date) : target.date ?? `${year}-01-01`,
    dayType: day?.dayType ?? 1,
    reason: day?.reason ?? "",
    applicableWorkingDays: day?.applicableWorkingDays ? String(day.applicableWorkingDays) : defaultSchedule,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (day) await updateCalendarDay(accessToken, day.id, form);
      else await createCalendarDay(accessToken, form);
      onSaved();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={day ? "Təqvim gününü redaktə et" : "Yeni təqvim günü"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <span className="cal-label">Gün növü</span>
          <TypePicker value={form.dayType} onChange={(v) => setForm({ ...form, dayType: v })} />
        </div>
        <div className="cal-form-2">
          <div className="form-field">
            <label htmlFor="cd-date">Tarix</label>
            <input id="cd-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="cd-name">Ad</label>
            <input
              id="cd-name"
              required
              placeholder="Məs. Novruz bayramı"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
        </div>
        <div className="form-field">
          <span className="cal-label">Hansı iş qrafikinə tətbiq olunur</span>
          <SchedulePicker value={form.applicableWorkingDays} onChange={(v) => setForm({ ...form, applicableWorkingDays: v })} />
        </div>
        <div className="form-field">
          <label htmlFor="cd-reason">Səbəb (ixtiyari)</label>
          <input id="cd-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="cal-modal-foot">
          {day && (
            <button type="button" className="panel-btn panel-btn-danger left" onClick={() => onDelete(day)}>
              Sil
            </button>
          )}
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Yadda saxla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------ Toplu əlavə ------------------------------ */

type BulkRow = { name: string; from: string; to: string; dayType: number };

function expandRange(from: string, to: string): string[] {
  if (!from) return [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to || from}T00:00:00Z`);
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 400; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function BulkModal({
  accessToken,
  year,
  onClose,
  onSaved,
}: {
  accessToken: string;
  year: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const emptyRow = (): BulkRow => ({ name: "", from: `${year}-01-01`, to: "", dayType: 1 });
  const [rows, setRows] = useState<BulkRow[]>([emptyRow()]);
  const [schedule, setSchedule] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = rows.reduce((n, r) => n + expandRange(r.from, r.to).length, 0);

  function patch(i: number, p: Partial<BulkRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.some((r) => r.to && r.to < r.from)) {
      setError("Bitmə tarixi başlanğıc tarixindən əvvəl ola bilməz");
      return;
    }
    const days: BulkCalendarDayItem[] = rows.flatMap((r) =>
      expandRange(r.from, r.to).map((date) => ({
        name: r.name,
        date,
        dayType: r.dayType,
        reason: "",
        applicableWorkingDays: schedule ? Number(schedule) : null,
      })),
    );
    setSaving(true);
    setError(null);
    try {
      const res = await bulkCreateCalendarDays(accessToken, days);
      const skipped = res.skippedDates.length;
      onSaved(`${res.createdCount} gün əlavə edildi${skipped ? `, ${skipped} gün artıq mövcud olduğu üçün atlandı` : ""}.`);
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Təqvim günlərini toplu əlavə et" wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <span className="cal-label">Hansı iş qrafikinə tətbiq olunur</span>
          <SchedulePicker value={schedule} onChange={setSchedule} />
        </div>

        <div className="cal-bulk-head">
          <span>Ad</span>
          <span>Başlanğıc</span>
          <span>Bitmə (boşdursa 1 gün)</span>
          <span>Növ</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="cal-bulk-row">
            <input
              required
              placeholder="Məs. Novruz bayramı"
              aria-label="Ad"
              value={r.name}
              onChange={(e) => patch(i, { name: e.target.value })}
            />
            <input type="date" required aria-label="Başlanğıc" value={r.from} onChange={(e) => patch(i, { from: e.target.value })} />
            <input type="date" aria-label="Bitmə" value={r.to} min={r.from} onChange={(e) => patch(i, { to: e.target.value })} />
            <select aria-label="Növ" value={r.dayType} onChange={(e) => patch(i, { dayType: Number(e.target.value) })}>
              {CALENDAR_DAY_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {TYPE_INFO[o.value]?.label ?? o.label}
                </option>
              ))}
            </select>
            {rows.length > 1 ? (
              <button type="button" className="cal-icon-btn danger" aria-label="Sətri sil" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
                ✕
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        <button type="button" className="panel-btn panel-btn-sm" onClick={() => setRows([...rows, emptyRow()])}>
          + Sətir əlavə et
        </button>

        {error && <p className="form-error">{error}</p>}
        <div className="cal-modal-foot" style={{ marginTop: 18 }}>
          <span className="cal-bulk-sum">Cəmi {total} gün</span>
          <span style={{ marginRight: "auto", fontSize: 12, color: "var(--muted)" }}>Artıq mövcud tarixlər atlanır.</span>
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || total === 0}>
            {saving ? "Saxlanılır…" : "Əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
