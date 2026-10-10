"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../../lib/auth/AuthContext";
import {
  EDUCATION_LEVELS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  MILITARY_SERVICES,
  WORKING_DAYS,
  addEducationHistory,
  addWorkHistory,
  deleteEducationHistory,
  deleteWorkHistory,
  getEducationHistories,
  getEmployee,
  getWorkHistories,
  getWorkSchedule,
  optionLabel,
  setWorkSchedule,
  updateEmployeeSection,
  type EducationHistory,
  type EmployeeDetail,
  type EmployeeForm,
  type WorkExperience,
  type WorkHistory,
  type WorkSchedule,
} from "../../../../lib/api/hr";
import { Modal } from "../../../Modal";
import { InstitutionPicker } from "../../Pickers";
import { formatDate, fullName, hrErrorMessage } from "../../shared";
import { employeeToForm } from "../EmployeeForm";
import { EMPLOYEE_SECTIONS, type EmployeeSectionKey } from "../EmployeeSections";

type Tab = "info" | "schedule" | "work" | "education";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Məlumatlar" },
  { key: "schedule", label: "İş qrafiki" },
  { key: "work", label: "İş tarixçəsi" },
  { key: "education", label: "Təhsil" },
];

const experienceText = (x: WorkExperience | null) => (x ? `${x.years} il, ${x.months} ay, ${x.days} gün` : "—");
const yesNo = (v: boolean) => (v ? "Bəli" : "Xeyr");

export function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const auth = useAuth();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [editing, setEditing] = useState<EmployeeSectionKey | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getEmployee(auth.accessToken, employeeId)
      .then((e) => {
        setEmployee(e);
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [auth, employeeId, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>İşçi alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }
  if (!employee) return <p className="panel-page-lead">Yüklənir…</p>;

  const initials = `${employee.surname[0] ?? ""}${employee.name[0] ?? ""}`.toUpperCase();

  return (
    <div>
      <div className="hr-profile">
        <div className="hr-avatar">{initials}</div>
        <div className="hr-profile-main">
          <h2>{fullName(employee)}</h2>
          <p>
            {employee.job?.name ?? "Vəzifə təyin edilməyib"} · Tabel №{employee.registerNumber}
          </p>
        </div>
        <div className="hr-profile-stats">
          <div className="hr-stat">
            <strong>{formatDate(employee.startWorkDate)}</strong>
            <span>İşə başlama</span>
          </div>
          <div className="hr-stat">
            <strong>{experienceText(employee.organizationWorkExperience)}</strong>
            <span>Bu təşkilatda</span>
          </div>
          <div className="hr-stat">
            <strong>{optionLabel(EMPLOYMENT_TYPES, employee.employmentType)}</strong>
            <span>İş rejimi</span>
          </div>
          <div className="hr-stat">
            <span
              className={`panel-role-tag ${employee.isActive === 1 ? "panel-role-tag-good" : "panel-role-tag-bad"}`}
            >
              {optionLabel(EMPLOYEE_STATUSES, employee.isActive)}
            </span>
          </div>
        </div>
      </div>

      <div className="hr-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`hr-tab ${tab === t.key ? "hr-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab employee={employee} onEdit={setEditing} />}
      {tab === "schedule" && <ScheduleTab accessToken={accessToken} employeeId={employeeId} />}
      {tab === "work" && <WorkHistoryTab accessToken={accessToken} employeeId={employeeId} />}
      {tab === "education" && <EducationTab accessToken={accessToken} employeeId={employeeId} />}

      {editing && (
        <EditSectionModal
          section={editing}
          employee={employee}
          accessToken={accessToken}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function KV({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`hr-kv-item${wide ? " hr-kv-item-wide" : ""}`}>
      <span className="hr-kv-label">{label}</span>
      <span className="hr-kv-value">{value === null || value === undefined || value === "" ? "—" : value}</span>
    </div>
  );
}

function InfoSection({
  title,
  section,
  onEdit,
  children,
}: {
  title: string;
  section: EmployeeSectionKey;
  onEdit: (section: EmployeeSectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="hr-section">
      <h3 className="hr-section-title">
        {title}
        <button type="button" className="panel-btn panel-btn-sm hr-section-edit" onClick={() => onEdit(section)}>
          Redaktə et
        </button>
      </h3>
      <div className="hr-kv">{children}</div>
    </section>
  );
}

function InfoTab({ employee: e, onEdit }: { employee: EmployeeDetail; onEdit: (s: EmployeeSectionKey) => void }) {
  return (
    <>
      <InfoSection title="Şəxsi məlumatlar" section="personal" onEdit={onEdit}>
        <KV label="Cins" value={optionLabel(GENDERS, e.gender)} />
        <KV label="Doğum tarixi" value={formatDate(e.birthDate)} />
        <KV label="Milliyyət" value={e.nationality} />
        <KV label="FİN kod" value={e.finCode} />
        <KV label="Şəxsiyyət vəsiqəsi" value={e.idCardNumber} />
        <KV label="SSN" value={e.socialSecurityNumber} />
      </InfoSection>

      <InfoSection title="Ailə və sosial vəziyyət" section="family" onEdit={onEdit}>
        <KV label="Ailə vəziyyəti" value={optionLabel(MARITAL_STATUSES, e.maritalStatus)} />
        <KV label="Uşaqların sayı" value={e.numberOfChildren} />
        <KV label="14 yaşadək uşaqlar" value={e.childrenUnder14Count} />
        <KV label="Hərbi xidmət" value={optionLabel(MILITARY_SERVICES, e.militaryService)} />
        <KV label="Təhsil" value={optionLabel(EDUCATION_LEVELS, e.education)} />
        <KV label="Veteran" value={yesNo(e.veteran)} />
        <KV label="Əlillik" value={yesNo(e.disability)} />
        <KV label="Qarabağ və azad olunmuş ərazilərdə" value={yesNo(e.isKarabakhWorker)} />
        <KV label="Tək valideyn" value={yesNo(e.isSingleParent)} />
        <KV label="Əlil uşağı var" value={yesNo(e.hasDisabledChild)} />
      </InfoSection>

      <InfoSection title="Əlaqə" section="contact" onEdit={onEdit}>
        <KV label="Mobil telefon" value={e.phoneNumber} />
        <KV label="Ev telefonu" value={e.homePhoneNumber} />
        <KV label="E-poçt" value={e.email} />
        <KV label="Qeydiyyat ünvanı" value={e.registeredAddress} wide />
        <KV label="Faktiki ünvan" value={e.currentAddress} wide />
      </InfoSection>

      <InfoSection title="İş məlumatları" section="work" onEdit={onEdit}>
        <KV label="Vəzifə" value={e.job?.name} />
        <KV label="İş rejimi" value={optionLabel(EMPLOYMENT_TYPES, e.employmentType)} />
        <KV label="İş həftəsi" value={optionLabel(WORKING_DAYS, e.workingDays)} />
        <KV label="İllik əsas məzuniyyət" value={`${e.vacationDays} gün`} />
        <KV label="Ümumi iş stajı" value={experienceText(e.totalWorkExperience)} />
        <KV label="Bu təşkilatdakı staj" value={experienceText(e.organizationWorkExperience)} />
      </InfoSection>

      <InfoSection title="Müqavilə və bank" section="bank" onEdit={onEdit}>
        <KV label="Əmək müqaviləsi №" value={e.contractNumber} />
        <KV label="Maaş bankı" value={e.salaryBankName} />
        <KV label="Bank hesabı" value={e.employeeBankAccountNumber} />
        <KV label="Qeydə alan" value={e.createdBy?.name} />
      </InfoSection>
    </>
  );
}

function EditSectionModal({
  section,
  employee,
  accessToken,
  onClose,
  onSaved,
}: {
  section: EmployeeSectionKey;
  employee: EmployeeDetail;
  accessToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EmployeeForm>(() => employeeToForm(employee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const def = EMPLOYEE_SECTIONS[section];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateEmployeeSection(accessToken, employee.id, form, def.keys);
      onSaved();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={def.title} wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {def.render({ form, setForm })}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
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

/* ----------------------------- İş qrafiki ----------------------------- */

const DAYS: { key: keyof Omit<WorkSchedule, "id" | "effectiveFrom">; label: string }[] = [
  { key: "monday", label: "Bazar ertəsi" },
  { key: "tuesday", label: "Çərşənbə axşamı" },
  { key: "wednesday", label: "Çərşənbə" },
  { key: "thursday", label: "Cümə axşamı" },
  { key: "friday", label: "Cümə" },
  { key: "saturday", label: "Şənbə" },
  { key: "sunday", label: "Bazar" },
];

const SCHEDULE_PRESETS: { label: string; hours: Record<string, string> }[] = [
  { label: "5 günlük · 8 saat", hours: { monday: "8", tuesday: "8", wednesday: "8", thursday: "8", friday: "8", saturday: "", sunday: "" } },
  { label: "6 günlük · 8 saat", hours: { monday: "8", tuesday: "8", wednesday: "8", thursday: "8", friday: "8", saturday: "8", sunday: "" } },
  { label: "Yarım ştat · 4 saat", hours: { monday: "4", tuesday: "4", wednesday: "4", thursday: "4", friday: "4", saturday: "", sunday: "" } },
];

function ScheduleTab({ accessToken, employeeId }: { accessToken: string; employeeId: string }) {
  const [hours, setHours] = useState<Record<string, string> | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWorkSchedule(accessToken, employeeId)
      .then((s) => {
        setEffectiveFrom(s.effectiveFrom);
        setHours(Object.fromEntries(DAYS.map((d) => [d.key, s[d.key] === null ? "" : String(s[d.key])])));
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId]);

  function update(next: Record<string, string>) {
    setHours(next);
    setSaved(false);
  }

  async function handleSave() {
    if (!hours) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setWorkSchedule(
        accessToken,
        employeeId,
        Object.fromEntries(DAYS.map((d) => [d.key, hours[d.key] === "" ? null : Number(hours[d.key])])) as Omit<
          WorkSchedule,
          "id" | "effectiveFrom"
        >,
      );
      setSaved(true);
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!hours) return error ? <p className="form-error">{error}</p> : <p className="panel-page-lead">Yüklənir…</p>;

  const workDays = DAYS.filter((d) => hours[d.key] !== "").length;
  const totalHours = DAYS.reduce((sum, d) => sum + (hours[d.key] === "" ? 0 : Number(hours[d.key]) || 0), 0);

  return (
    <section className="hr-section">
      <h3 className="hr-section-title">Həftəlik iş qrafiki</h3>
      <p className="hr-note">
        Hər gün üçün iş saatını təyin edin, istirahət günlərini söndürün. Yeni qrafik saxlandığı gündən qüvvəyə minir,
        tabel isə işçinin qrafikinə görə hesablanır
        {effectiveFrom ? ` (cari qrafik ${formatDate(effectiveFrom)} tarixindən).` : "."}
      </p>

      <div className="hr-presets">
        <span className="hr-kv-label">Hazır şablon</span>
        {SCHEDULE_PRESETS.map((p) => (
          <button key={p.label} type="button" className="panel-btn panel-btn-sm" onClick={() => update({ ...p.hours })}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="hr-days">
        {DAYS.map((d) => {
          const on = hours[d.key] !== "";
          return (
            <div key={d.key} className={`hr-day ${on ? "" : "hr-day-off"}`}>
              <div className="hr-day-head">
                <strong>{d.label}</strong>
                <label className="hr-switch" title={on ? "İş günü" : "İstirahət"}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => update({ ...hours, [d.key]: e.target.checked ? "8" : "" })}
                  />
                  <span />
                </label>
              </div>
              {on ? (
                <div className="hr-day-hours">
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step="0.5"
                    aria-label={`${d.label} iş saatı`}
                    value={hours[d.key]}
                    onChange={(e) => update({ ...hours, [d.key]: e.target.value })}
                  />
                  <span>saat</span>
                </div>
              ) : (
                <div className="hr-day-rest">İstirahət</div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="hr-schedule-foot">
        <div className="hr-profile-stats">
          <div className="hr-stat">
            <strong>{workDays}</strong>
            <span>İş günü</span>
          </div>
          <div className="hr-stat">
            <strong>{totalHours}</strong>
            <span>Həftəlik saat</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && <span className="hr-note" style={{ margin: 0 }}>Qrafik saxlanıldı ✓</span>}
          <button type="button" className="panel-btn panel-btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saxlanılır…" : "Qrafiki yadda saxla"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- İş tarixçəsi ----------------------------- */

function WorkHistoryTab({ accessToken, employeeId }: { accessToken: string; employeeId: string }) {
  const [items, setItems] = useState<WorkHistory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    getWorkHistories(accessToken, employeeId)
      .then((res) => {
        // ən yeni iş yeri yuxarıda
        setItems([...res].sort((a, b) => b.startDate.localeCompare(a.startDate)));
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId, reloadKey]);

  async function handleDelete(item: WorkHistory) {
    if (!window.confirm(`${item.companyName} qeydi silinsin?`)) return;
    try {
      await deleteWorkHistory(accessToken, item.id);
      load();
    } catch (err) {
      setError(hrErrorMessage(err));
    }
  }

  return (
    <section className="hr-section">
      <h3 className="hr-section-title">
        Əvvəlki iş yerləri
        <button type="button" className="panel-btn panel-btn-sm panel-btn-primary hr-section-edit" onClick={() => setShowAdd(true)}>
          + İş yeri əlavə et
        </button>
      </h3>
      <p className="hr-note">
        İşçinin bu təşkilatdan əvvəlki iş yerləri. Burada daxil edilən müddətlər ümumi iş stajının hesablanmasına daxil olur.
      </p>

      {error && <p className="form-error">{error}</p>}

      {!items ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : items.length === 0 ? (
        <div className="hr-empty">
          <strong>Əvvəlki iş yeri qeydə alınmayıb</strong>
          <span>Staj düzgün hesablansın deyə işçinin əvvəlki iş yerlərini əlavə edin.</span>
        </div>
      ) : (
        <ol className="hr-timeline">
          {items.map((h) => (
            <li key={h.id} className="hr-tl-item">
              <span className="hr-tl-dot" />
              <div className="hr-tl-card">
                <div className="hr-tl-top">
                  <div>
                    <strong className="hr-tl-company">{h.companyName}</strong>
                    <span className="hr-tl-position">{h.position}</span>
                  </div>
                  <button
                    type="button"
                    className="panel-btn panel-btn-sm panel-btn-danger"
                    onClick={() => handleDelete(h)}
                  >
                    Sil
                  </button>
                </div>
                <div className="hr-tl-meta">
                  <span className="panel-role-tag">
                    {formatDate(h.startDate)} – {h.endDate ? formatDate(h.endDate) : "davam edir"}
                  </span>
                  <span className="hr-tl-duration">{experienceText(h.duration)}</span>
                </div>
                {h.notes && <p className="hr-tl-notes">{h.notes}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {showAdd && (
        <AddWorkHistoryModal
          accessToken={accessToken}
          employeeId={employeeId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </section>
  );
}

function AddWorkHistoryModal({
  accessToken,
  employeeId,
  onClose,
  onSaved,
}: {
  accessToken: string;
  employeeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addWorkHistory(accessToken, { employeeId, companyName, position, startDate, endDate, notes });
      onSaved();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Əvvəlki iş yeri" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="wh-company">Təşkilat</label>
          <input id="wh-company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="wh-position">Vəzifə</label>
          <input id="wh-position" required value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="wh-start">Başlanğıc tarixi</label>
          <input id="wh-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="wh-end">Bitmə tarixi</label>
          <input id="wh-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="wh-notes">Qeyd</label>
          <input id="wh-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------- Təhsil ----------------------------- */

function EducationTab({ accessToken, employeeId }: { accessToken: string; employeeId: string }) {
  const [items, setItems] = useState<EducationHistory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getEducationHistories(accessToken, employeeId)
      .then((res) => {
        // ən yeni təhsil yuxarıda
        setItems([...res].sort((a, b) => b.startDate.localeCompare(a.startDate)));
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId, reloadKey]);

  async function handleDelete(item: EducationHistory) {
    if (!window.confirm(`${item.educationalInstitutionName ?? "Təhsil"} qeydi silinsin?`)) return;
    try {
      await deleteEducationHistory(accessToken, item.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(hrErrorMessage(err));
    }
  }

  return (
    <section className="hr-section">
      <h3 className="hr-section-title">
        Təhsil
        <button type="button" className="panel-btn panel-btn-sm panel-btn-primary hr-section-edit" onClick={() => setShowAdd(true)}>
          + Təhsil əlavə et
        </button>
      </h3>
      <p className="hr-note">İşçinin bitirdiyi və ya davam etdirdiyi təhsil müəssisələri, diplom məlumatları.</p>

      {error && <p className="form-error">{error}</p>}

      {!items ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : items.length === 0 ? (
        <div className="hr-empty">
          <strong>Təhsil qeydi yoxdur</strong>
          <span>İşçinin təhsil müəssisəsini və diplom məlumatlarını əlavə edin.</span>
        </div>
      ) : (
        <ol className="hr-timeline">
          {items.map((h) => (
            <li key={h.id} className="hr-tl-item">
              <span className="hr-tl-dot" />
              <div className="hr-tl-card">
                <div className="hr-tl-top">
                  <div>
                    <strong className="hr-tl-company">{h.educationalInstitutionName ?? "—"}</strong>
                    <span className="hr-tl-position">
                      {h.faculty}
                      {h.specialty ? ` · ${h.specialty}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="panel-btn panel-btn-sm panel-btn-danger"
                    onClick={() => handleDelete(h)}
                  >
                    Sil
                  </button>
                </div>
                <div className="hr-tl-meta">
                  <span className="panel-role-tag">{optionLabel(EDUCATION_LEVELS, h.educationLevel)}</span>
                  <span className="hr-tl-duration">
                    {formatDate(h.startDate)} – {h.endDate ? formatDate(h.endDate) : "davam edir"}
                  </span>
                </div>
                {(h.diplomaNumber || h.registerNumber) && (
                  <div className="hr-tl-facts">
                    {h.diplomaNumber && (
                      <span>
                        <em>Diplom:</em> {h.diplomaNumber}
                      </span>
                    )}
                    {h.registerNumber && (
                      <span>
                        <em>Qeydiyyat №:</em> {h.registerNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {showAdd && (
        <AddEducationModal
          accessToken={accessToken}
          employeeId={employeeId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

function AddEducationModal({
  accessToken,
  employeeId,
  onClose,
  onSaved,
}: {
  accessToken: string;
  employeeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [institutionId, setInstitutionId] = useState("");
  const [level, setLevel] = useState(1);
  const [faculty, setFaculty] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [diplomaNumber, setDiplomaNumber] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institutionId) {
      setError("Təhsil ocağı seçilməlidir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addEducationHistory(accessToken, {
        employeeId,
        educationalInstitutionId: institutionId,
        educationLevel: level,
        faculty,
        specialty,
        startDate,
        endDate,
        diplomaNumber,
        registerNumber,
      });
      onSaved();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Təhsil məlumatı" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Təhsil ocağı</label>
          <InstitutionPicker value={institutionId} onChange={setInstitutionId} />
        </div>
        <div className="form-field">
          <label htmlFor="edu-level">Təhsil səviyyəsi</label>
          <select id="edu-level" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {EDUCATION_LEVELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="edu-faculty">Fakültə</label>
          <input id="edu-faculty" required value={faculty} onChange={(e) => setFaculty(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="edu-specialty">İxtisas</label>
          <input id="edu-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="edu-start">Başlanğıc</label>
          <input id="edu-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="edu-end">Bitmə</label>
          <input id="edu-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="edu-diploma">Diplomun seriya və nömrəsi</label>
          <input id="edu-diploma" value={diplomaNumber} onChange={(e) => setDiplomaNumber(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="edu-register">Qeydiyyat nömrəsi</label>
          <input id="edu-register" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
