"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { downloadTimesheet, getTimesheet, type Timesheet } from "../../../lib/api/hr";
import { hrErrorMessage } from "../shared";

const pad = (n: number) => String(n).padStart(2, "0");

const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

// JS getDay(): 0 = bazar … 6 = şənbə
const WEEKDAY_SHORT = ["B", "B.e", "Ç.a", "Çər", "C.a", "Cüm", "Şən"];

type LegendItem = { code: string; label: string; cls: string };
const LEGEND_GROUPS: { title: string; items: LegendItem[] }[] = [
  {
    title: "İş və istirahət",
    items: [
      { code: "İ", label: "İş günü (altında iş saatı)", cls: "tb-work" },
      { code: "Q", label: "Qeyri-iş günü (istirahət)", cls: "tb-off" },
      { code: "B", label: "Bayram / hüzn günü", cls: "tb-holiday" },
    ],
  },
  {
    title: "Məzuniyyətlər",
    items: [
      { code: "M", label: "Əmək məzuniyyəti", cls: "tb-m" },
      { code: "TM", label: "Təhsil məzuniyyəti", cls: "tb-tm" },
      { code: "ÖM", label: "Ödənişsiz məzuniyyət", cls: "tb-om" },
      { code: "Y", label: "Sosial məzuniyyət", cls: "tb-y" },
    ],
  },
  {
    title: "Digər",
    items: [
      { code: "X", label: "Xəstəlik vərəqəsi", cls: "tb-sick" },
      { code: "E", label: "Ezamiyyət", cls: "tb-trip" },
      { code: "İG", label: "İşə gəlməmə (üzrsüz)", cls: "tb-absent" },
    ],
  },
];

function codeClass(code: string): string {
  switch (code) {
    case "İ":
      return "tb-work";
    case "Q":
      return "tb-off";
    case "B":
    case "H":
      return "tb-holiday";
    case "M":
      return "tb-m";
    case "TM":
      return "tb-tm";
    case "ÖM":
      return "tb-om";
    case "Y":
      return "tb-y";
    case "X":
      return "tb-sick";
    case "E":
      return "tb-trip";
    case "İG":
      return "tb-absent";
    case "-":
      return "tb-none";
    default:
      return "tb-m";
  }
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function DavamiyyetView() {
  const auth = useAuth();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [sheet, setSheet] = useState<Timesheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getTimesheet(auth.accessToken, period.year, period.month)
      .then((res) => {
        setSheet(res);
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [auth, period]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  function go(delta: number) {
    setSheet(null);
    setPeriod((p) => shiftMonth(p.year, p.month, delta));
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadTimesheet(accessToken, period.year, period.month);
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const days = sheet
    ? Array.from({ length: sheet.daysInMonth }, (_, i) => {
        const day = i + 1;
        const weekday = new Date(period.year, period.month - 1, day).getDay();
        return { day, weekday, weekend: weekday === 0 || weekday === 6 };
      })
    : [];
  const weekendCount = days.filter((d) => d.weekend).length;
  const today = new Date();
  const todayDay =
    today.getFullYear() === period.year && today.getMonth() + 1 === period.month ? today.getDate() : null;

  return (
    <div>
      <div className="tb-toolbar">
        <div className="tb-period">
          <button type="button" className="panel-btn panel-btn-sm" aria-label="Əvvəlki ay" onClick={() => go(-1)}>
            ‹
          </button>
          <select
            className="panel-select"
            aria-label="Ay"
            value={period.month}
            onChange={(e) => {
              setSheet(null);
              setPeriod({ ...period, month: Number(e.target.value) });
            }}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <input
            className="panel-select tb-year"
            type="number"
            aria-label="İl"
            min={2000}
            max={2100}
            value={period.year}
            onChange={(e) => {
              const y = Number(e.target.value);
              if (y >= 2000 && y <= 2100) {
                setSheet(null);
                setPeriod({ ...period, year: y });
              }
            }}
          />
          <button type="button" className="panel-btn panel-btn-sm" aria-label="Növbəti ay" onClick={() => go(1)}>
            ›
          </button>
          <button
            type="button"
            className="panel-btn panel-btn-sm"
            onClick={() => {
              setSheet(null);
              setPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 });
            }}
          >
            Bu ay
          </button>
        </div>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          disabled={exporting || !sheet}
          onClick={handleExport}
        >
          {exporting ? "Hazırlanır…" : "Excel-ə yüklə"}
        </button>
      </div>

      {sheet && (
        <div className="tb-summary">
          <div className="tb-summary-item">
            <strong>{sheet.employees.length}</strong>
            <span>İşçi</span>
          </div>
          <div className="tb-summary-item">
            <strong>{sheet.daysInMonth}</strong>
            <span>Təqvim günü</span>
          </div>
          <div className="tb-summary-item">
            <strong>{weekendCount}</strong>
            <span>Şənbə və bazar</span>
          </div>
          <div className="tb-summary-item">
            <strong>{sheet.employees[0]?.normWorkingDays ?? "—"}</strong>
            <span>İş günü norması</span>
          </div>
        </div>
      )}

      <div className="tb-legend">
        {LEGEND_GROUPS.map((g) => (
          <div key={g.title} className="tb-legend-group">
            <span className="tb-legend-title">{g.title}</span>
            <div className="tb-legend-list">
              {g.items.map((l) => (
                <span key={l.code} className="tb-legend-item">
                  <span className={`tb-chip ${l.cls}`}>{l.code}</span>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className="tb-legend-group">
          <span className="tb-legend-title">Həftə sonu</span>
          <div className="tb-legend-list">
            <span className="tb-legend-item">
              <span className="tb-legend-weekend">Şən · B</span>
              Şənbə və bazar sütunları narıncı fonla seçilir
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!sheet ? (
        !error && <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="tb-wrap">
          <table className="tb-table">
            <thead>
              <tr>
                <th className="tb-sticky tb-col-no" rowSpan={2}>
                  №
                </th>
                <th className="tb-sticky tb-col-name" rowSpan={2}>
                  İşçi
                </th>
                {days.map((d) => (
                  <th
                    key={d.day}
                    className={`tb-day-head ${d.weekend ? "tb-weekend" : ""} ${d.day === todayDay ? "tb-today" : ""}`}
                  >
                    {d.day}
                  </th>
                ))}
                <th rowSpan={2} className="tb-sum-head">
                  Norma
                  <small>gün / saat</small>
                </th>
                <th rowSpan={2} className="tb-sum-head">
                  Faktiki
                  <small>gün / saat</small>
                </th>
                <th rowSpan={2} className="tb-sum-head">
                  Məzuniyyət
                  <small>gün</small>
                </th>
              </tr>
              <tr>
                {days.map((d) => (
                  <th
                    key={d.day}
                    className={`tb-wd-head ${d.weekend ? "tb-weekend" : ""} ${d.day === todayDay ? "tb-today" : ""}`}
                  >
                    {WEEKDAY_SHORT[d.weekday]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.employees.length === 0 && (
                <tr>
                  <td colSpan={days.length + 5} className="tb-empty">
                    Bu ay üçün işçi yoxdur.
                  </td>
                </tr>
              )}
              {sheet.employees.map((row) => {
                const byDay = new Map(row.days.map((d) => [d.day, d]));
                return (
                  <tr key={row.employee.id}>
                    <td className="tb-sticky tb-col-no">{row.registerNumber}</td>
                    <td className="tb-sticky tb-col-name">
                      <strong>{row.employee.name}</strong>
                      {row.position && <small>{row.position.name}</small>}
                    </td>
                    {days.map((d) => {
                      const cell = byDay.get(d.day);
                      const code = cell?.dayCode ?? "-";
                      return (
                        <td
                          key={d.day}
                          className={`tb-cell ${d.weekend ? "tb-weekend" : ""} ${d.day === todayDay ? "tb-today" : ""}`}
                          title={`${pad(d.day)}.${pad(period.month)}.${period.year}${
                            cell?.workedHours ? ` · ${cell.workedHours} saat` : ""
                          }`}
                        >
                          <span className={`tb-chip ${codeClass(code)}`}>{code}</span>
                          {code === "İ" && cell?.workedHours ? <small>{cell.workedHours}</small> : null}
                        </td>
                      );
                    })}
                    <td className="tb-sum">
                      {row.normWorkingDays} / {row.normWorkedHours}
                    </td>
                    <td className="tb-sum">
                      <strong>
                        {row.actualWorkingDays} / {row.actualWorkedHours}
                      </strong>
                    </td>
                    <td className="tb-sum">
                      {row.annualLeaveDays + row.educationLeaveDays + row.unpaidLeaveDays + row.socialLeaveDays}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
