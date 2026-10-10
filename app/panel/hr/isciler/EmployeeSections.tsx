"use client";

import {
  EDUCATION_LEVELS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  MILITARY_SERVICES,
  WORKING_DAYS,
  type EmployeeForm,
  type Option,
} from "../../../lib/api/hr";
import { JobPicker } from "../Pickers";

function Select({
  id,
  label,
  value,
  options,
  onChange,
  allowEmpty,
}: {
  id: string;
  label: string;
  value: string | number;
  options: Option[];
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {allowEmpty && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export type FieldsProps = {
  form: EmployeeForm;
  setForm: (updater: (prev: EmployeeForm) => EmployeeForm) => void;
};

function useFieldHelpers({ form, setForm }: FieldsProps) {
  const set = <K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const input = (
    id: keyof EmployeeForm,
    label: string,
    extra?: React.InputHTMLAttributes<HTMLInputElement> & { wide?: boolean },
  ) => {
    const { wide, ...rest } = extra ?? {};
    return (
      <div className={`form-field${wide ? " form-field-wide" : ""}`}>
        <label htmlFor={`emp-${id}`}>{label}</label>
        <input
          id={`emp-${id}`}
          value={String(form[id] ?? "")}
          onChange={(e) => set(id, e.target.value as never)}
          {...rest}
        />
      </div>
    );
  };

  const check = (id: keyof EmployeeForm, label: string) => (
    <label>
      <input type="checkbox" checked={Boolean(form[id])} onChange={(e) => set(id, e.target.checked as never)} />
      {label}
    </label>
  );

  return { set, input, check };
}

function PersonalFields(props: FieldsProps) {
  const { set, input } = useFieldHelpers(props);
  return (
    <div className="hr-grid">
      {input("surname", "Soyad", { required: true })}
      {input("name", "Ad", { required: true })}
      {input("fathersName", "Ata adı", { required: true })}
      <Select id="emp-gender" label="Cins" value={props.form.gender} options={GENDERS} onChange={(v) => set("gender", Number(v))} />
      {input("birthDate", "Doğum tarixi", { type: "date" })}
      {input("nationality", "Milliyyət")}
      {input("finCode", "FİN kod", { maxLength: 20 })}
      {input("idCardNumber", "Şəxsiyyət vəsiqəsinin nömrəsi")}
      {input("socialSecurityNumber", "Sosial sığorta nömrəsi (SSN)")}
    </div>
  );
}

function FamilyFields(props: FieldsProps) {
  const { set, input, check } = useFieldHelpers(props);
  const { form } = props;
  return (
    <>
      <div className="hr-grid">
        <Select
          id="emp-marital"
          label="Ailə vəziyyəti"
          value={form.maritalStatus}
          options={MARITAL_STATUSES}
          allowEmpty
          onChange={(v) => set("maritalStatus", v)}
        />
        {input("numberOfChildren", "Uşaqların sayı", { type: "number", min: 0 })}
        {input("childrenUnder14Count", "14 yaşadək uşaqların sayı", { type: "number", min: 0 })}
        <Select
          id="emp-military"
          label="Hərbi xidmət"
          value={form.militaryService}
          options={MILITARY_SERVICES}
          allowEmpty
          onChange={(v) => set("militaryService", v)}
        />
        <Select
          id="emp-education"
          label="Təhsil"
          value={form.education}
          options={EDUCATION_LEVELS}
          allowEmpty
          onChange={(v) => set("education", v)}
        />
      </div>
      <div className="hr-checks">
        {check("veteran", "Veteran")}
        {check("disability", "Əlillik")}
        {check("isKarabakhWorker", "Qarabağ və azad olunmuş ərazilərdə çalışır")}
        {check("isSingleParent", "Tək valideyn")}
        {check("hasDisabledChild", "Əlil uşağı var")}
      </div>
    </>
  );
}

function ContactFields(props: FieldsProps) {
  const { input } = useFieldHelpers(props);
  return (
    <div className="hr-grid">
      {input("phoneNumber", "Mobil telefon", { maxLength: 20 })}
      {input("homePhoneNumber", "Ev telefonu", { maxLength: 20 })}
      {input("email", "E-poçt", { type: "email" })}
      {input("registeredAddress", "Qeydiyyat ünvanı", { wide: true })}
      {input("currentAddress", "Faktiki ünvan", { wide: true })}
    </div>
  );
}

function WorkFields(props: FieldsProps & { mode: "create" | "edit" }) {
  const { set, input } = useFieldHelpers(props);
  const { form, mode } = props;
  return (
    <>
      {mode === "create" ? (
        <div className="hr-grid">
          <div className="form-field">
            <label>Vəzifə</label>
            <JobPicker value={form.jobId} onChange={(id) => set("jobId", id)} />
          </div>
          {input("startWorkDate", "İşə başlama tarixi", { type: "date", required: true })}
        </div>
      ) : (
        <p className="hr-note">Vəzifə dəyişikliyi müvafiq ərizə və əmr vasitəsilə aparılır.</p>
      )}
      <div className="hr-grid">
        <Select
          id="emp-type"
          label="İş rejimi"
          value={form.employmentType}
          options={EMPLOYMENT_TYPES}
          onChange={(v) => set("employmentType", Number(v))}
        />
        <Select id="emp-wdays" label="İş həftəsi" value={form.workingDays} options={WORKING_DAYS} onChange={(v) => set("workingDays", v)} />
        {input("vacationDays", "İllik əsas məzuniyyət (gün)", { type: "number", min: 0 })}
        {mode === "edit" && (
          <Select
            id="emp-status"
            label="Status"
            value={form.isActive}
            options={EMPLOYEE_STATUSES}
            onChange={(v) => set("isActive", Number(v))}
          />
        )}
      </div>
    </>
  );
}

function BankFields(props: FieldsProps) {
  const { input } = useFieldHelpers(props);
  return (
    <div className="hr-grid">
      {input("contractNumber", "Əmək müqaviləsinin nömrəsi")}
      {input("salaryBankName", "Maaş bankı")}
      {input("employeeBankAccountNumber", "Bank hesabı")}
    </div>
  );
}

/** İşçi kartındakı hər bölmə: başlıq, redaktədə göndəriləcək sahələr və forma hissəsi. */
export type EmployeeSectionKey = "personal" | "family" | "contact" | "work" | "bank";

export const EMPLOYEE_SECTIONS: Record<
  EmployeeSectionKey,
  { title: string; keys: (keyof EmployeeForm)[]; render: (props: FieldsProps) => React.ReactNode }
> = {
  personal: {
    title: "Şəxsi məlumatlar",
    keys: ["surname", "name", "fathersName", "gender", "birthDate", "nationality", "finCode", "idCardNumber", "socialSecurityNumber"],
    render: (p) => <PersonalFields {...p} />,
  },
  family: {
    title: "Ailə və sosial vəziyyət",
    keys: [
      "maritalStatus", "numberOfChildren", "childrenUnder14Count", "militaryService", "education",
      "veteran", "disability", "isKarabakhWorker", "isSingleParent", "hasDisabledChild",
    ],
    render: (p) => <FamilyFields {...p} />,
  },
  contact: {
    title: "Əlaqə",
    keys: ["phoneNumber", "homePhoneNumber", "email", "registeredAddress", "currentAddress"],
    render: (p) => <ContactFields {...p} />,
  },
  work: {
    title: "İş məlumatları",
    keys: ["employmentType", "workingDays", "vacationDays", "isActive"],
    render: (p) => <WorkFields {...p} mode="edit" />,
  },
  bank: {
    title: "Müqavilə və bank",
    keys: ["contractNumber", "salaryBankName", "employeeBankAccountNumber"],
    render: (p) => <BankFields {...p} />,
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="hr-section">
      <h3 className="hr-section-title">{title}</h3>
      {children}
    </section>
  );
}

/** Yeni işçi yaradarkən bütün bölmələr bir formada göstərilir. */
export function EmployeeFormFields({ form, setForm }: FieldsProps) {
  const props = { form, setForm };
  return (
    <>
      <Section title={EMPLOYEE_SECTIONS.personal.title}>
        <PersonalFields {...props} />
      </Section>
      <Section title={EMPLOYEE_SECTIONS.family.title}>
        <FamilyFields {...props} />
      </Section>
      <Section title={EMPLOYEE_SECTIONS.contact.title}>
        <ContactFields {...props} />
      </Section>
      <Section title="İş məlumatları">
        <WorkFields {...props} mode="create" />
      </Section>
      <Section title={EMPLOYEE_SECTIONS.bank.title}>
        <BankFields {...props} />
      </Section>
    </>
  );
}
