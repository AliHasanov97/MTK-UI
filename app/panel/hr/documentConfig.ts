import { DISCIPLINARY_TYPES, EMPLOYMENT_TYPES, GENDERS, type ApplicationKind, type DirectOrderKind } from "../../lib/api/hr";
import type { FieldSpec } from "./DynamicForm";

// Sahə açarları backend-dəki Create/Add komandalarının property adlarıdır (camelCase).

export const APPLICATION_FIELDS: Record<ApplicationKind, FieldSpec[]> = {
  JobApplication: [
    { key: "surname", label: "Soyad", kind: "text", required: true },
    { key: "name", label: "Ad", kind: "text", required: true },
    { key: "fathersName", label: "Ata adı", kind: "text", required: true },
    { key: "gender", label: "Cins", kind: "select", options: GENDERS, required: true },
    { key: "telephone", label: "Telefon", kind: "text", required: true },
    { key: "homeTelephoneNumber", label: "Ev telefonu", kind: "text" },
    { key: "address", label: "Ünvan", kind: "text", required: true },
    { key: "jobId", label: "Vəzifə", kind: "job", required: true },
    { key: "startDate", label: "İşə başlama tarixi", kind: "date", required: true },
  ],
  ChangeOfPosition: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "newJobId", label: "Yeni vəzifə", kind: "job", required: true },
    { key: "setDate", label: "Dəyişiklik tarixi", kind: "date", required: true },
  ],
  VacationCompensation: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "requestedDays", label: "Kompensasiya ediləcək gün sayı", kind: "number", required: true, min: 1 },
    {
      key: "workYearStart",
      label: "İş ilinin başlanğıcı",
      kind: "date",
      hint: "Hansı iş ili üçün kompensasiya ödənilir (sənəddə yazılır). Hər iki tarixi doldurun və ya boş saxlayın.",
    },
    { key: "workYearEnd", label: "İş ilinin sonu", kind: "date" },
    { key: "notes", label: "Qeyd", kind: "text" },
  ],
  UnpaidLeave: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "startDate", label: "Başlanğıc tarixi", kind: "date", required: true },
    { key: "endDate", label: "Bitmə tarixi", kind: "date", required: true },
    { key: "notes", label: "Qeyd", kind: "text" },
  ],
  Vacation: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "startDate", label: "Başlanğıc tarixi", kind: "date", required: true },
    {
      key: "endDate",
      label: "Bitmə tarixi",
      kind: "date",
      hint: "Bitmə tarixi və ya gün sayından yalnız birini doldurun. Bayram günləri avtomatik çıxılır.",
    },
    { key: "requestedDays", label: "Gün sayı", kind: "number", min: 1 },
    { key: "notes", label: "Qeyd", kind: "text" },
  ],
  EducationLeave: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "startDate", label: "Başlanğıc tarixi", kind: "date", required: true },
    { key: "endDate", label: "Bitmə tarixi", kind: "date", required: true },
    { key: "reason", label: "Səbəb", kind: "text" },
  ],
  EmploymentStatusChange: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "newEmploymentType", label: "Yeni iş rejimi", kind: "select", options: EMPLOYMENT_TYPES, required: true },
    { key: "orderExecutionSupervisorId", label: "Əmrin icrasına nəzarət edən", kind: "employee", required: true },
  ],
  VacationReturn: [
    { key: "employeeId", label: "İşçi", kind: "employee", required: true },
    { key: "returnDate", label: "İşə qayıtma tarixi", kind: "date", required: true },
    { key: "notes", label: "Qeyd", kind: "text" },
  ],
};

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
].map((label, i) => ({ value: i + 1, label }));

export const DIRECT_ORDER_FIELDS: Record<DirectOrderKind, { label: string; fields: FieldSpec[] }> = {
  Bonus: {
    label: "Mükafat",
    fields: [
      { key: "employeeId", label: "İşçi", kind: "employee", required: true },
      { key: "orderExecutionSupervisorId", label: "Əmrin icrasına nəzarət edən", kind: "employee", required: true },
      { key: "bonusQuantity", label: "Mükafat məbləği (₼)", kind: "number", required: true, min: 1 },
      { key: "salaryMonth", label: "Maaş ayı", kind: "select", options: MONTHS, required: true },
      { key: "salaryYear", label: "Maaş ili", kind: "number", required: true, min: 2000, max: 2100 },
    ],
  },
  SalaryDeduction: {
    label: "Maaşdan tutulma",
    fields: [
      { key: "employeeId", label: "İşçi", kind: "employee", required: true },
      { key: "district", label: "Məhkəmə (rayon)", kind: "text", required: true },
      { key: "judgementNo", label: "Qərarın nömrəsi", kind: "number", required: true },
      { key: "judgementDate", label: "Qərarın tarixi", kind: "date", required: true },
      { key: "startDate", label: "Tutulmanın başlanğıcı", kind: "date", required: true },
      { key: "percentageSalary", label: "Maaşdan tutulma faizi", kind: "number", required: true, min: 1, max: 100 },
      { key: "stateFee", label: "Dövlət rüsumu (₼)", kind: "number", required: true },
      { key: "creditor", label: "Alacaqlı", kind: "text", required: true },
      { key: "debt", label: "Borc məbləği (₼)", kind: "number", required: true },
    ],
  },
  UnexcusedAbsence: {
    label: "İcazəsiz qeyb",
    fields: [
      { key: "employeeId", label: "İşçi", kind: "employee", required: true },
      { key: "setDate", label: "Qeyb tarixi", kind: "date", required: true },
    ],
  },
  Warning: {
    label: "Xəbərdarlıq / töhmət",
    fields: [
      { key: "employeeId", label: "İşçi", kind: "employee", required: true },
      { key: "orderExecutionSupervisorId", label: "Əmrin icrasına nəzarət edən", kind: "employee", required: true },
      { key: "disciplinaryType", label: "Növ", kind: "select", options: DISCIPLINARY_TYPES, required: true },
      { key: "setDate", label: "Tarix", kind: "date", required: true },
    ],
  },
  WorkOnNonWorkday: {
    label: "İstirahət / bayram günü işi",
    fields: [
      { key: "startDate", label: "Başlanğıc tarixi", kind: "date", required: true },
      { key: "endDate", label: "Bitmə tarixi", kind: "date", hint: "Boş buraxsanız yalnız başlanğıc günü nəzərdə tutulur." },
    ],
  },
};
