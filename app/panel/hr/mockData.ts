export type FieldSpec =
  | { key: string; label: string; kind: "date" }
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "number" }
  | { key: string; label: string; kind: "select"; options: string[] };

// ---------- Applications (ərizələr) ----------

export type ApplicationTypeValue =
  | "Vacation"
  | "UnpaidLeave"
  | "VacationCompensation"
  | "EducationLeave"
  | "VacationReturn"
  | "ChangeOfPosition"
  | "EmploymentStatusChange"
  | "JobApplication";

export const APPLICATION_TYPES: { value: ApplicationTypeValue; label: string }[] = [
  { value: "Vacation", label: "Məzuniyyət" },
  { value: "UnpaidLeave", label: "Ödənişsiz icazə" },
  { value: "VacationCompensation", label: "Məzuniyyət əvəzi" },
  { value: "EducationLeave", label: "Təhsil icazəsi" },
  { value: "VacationReturn", label: "Məzuniyyətdən geri qayıtma" },
  { value: "ChangeOfPosition", label: "Vəzifə dəyişikliyi" },
  { value: "EmploymentStatusChange", label: "İş rejimi dəyişikliyi" },
  { value: "JobApplication", label: "Vakansiyaya müraciət" },
];

export const APPLICATION_FIELD_SPECS: Record<ApplicationTypeValue, FieldSpec[]> = {
  Vacation: [
    { key: "startDate", label: "Başlanğıc tarixi", kind: "date" },
    { key: "endDate", label: "Bitmə tarixi", kind: "date" },
  ],
  UnpaidLeave: [
    { key: "startDate", label: "Başlanğıc tarixi", kind: "date" },
    { key: "endDate", label: "Bitmə tarixi", kind: "date" },
  ],
  VacationCompensation: [
    { key: "days", label: "Əvəzi ödəniləcək gün sayı", kind: "number" },
  ],
  EducationLeave: [
    { key: "startDate", label: "Başlanğıc tarixi", kind: "date" },
    { key: "endDate", label: "Bitmə tarixi", kind: "date" },
    { key: "institution", label: "Təhsil müəssisəsi", kind: "text" },
  ],
  VacationReturn: [{ key: "returnDate", label: "Geri qayıtma tarixi", kind: "date" }],
  ChangeOfPosition: [{ key: "newPosition", label: "Yeni vəzifə", kind: "text" }],
  EmploymentStatusChange: [
    {
      key: "newEmploymentType",
      label: "Yeni iş rejimi",
      kind: "select",
      options: ["Tam ştat", "Yarım ştat"],
    },
  ],
  JobApplication: [
    { key: "candidateName", label: "Namizədin adı", kind: "text" },
    { key: "vacancy", label: "Vakansiya", kind: "text" },
  ],
};

/** Application types that go through an application stage before becoming this order type. */
export const APPLICATION_TO_ORDER_TYPE: Record<ApplicationTypeValue, string> = {
  Vacation: "Vacation",
  UnpaidLeave: "UnpaidLeave",
  VacationCompensation: "VacationCompensation",
  EducationLeave: "EducationLeave",
  VacationReturn: "VacationReturn",
  ChangeOfPosition: "ChangeOfPosition",
  EmploymentStatusChange: "EmploymentStatusChange",
  JobApplication: "Employment",
};

export type ApplicationStatus = "PendingApproval" | "ConvertedToOrder";

export type Application = {
  id: string;
  applicationNumber: string;
  type: ApplicationTypeValue;
  employeeName?: string;
  fields: Record<string, string>;
  notes?: string;
  status: ApplicationStatus;
  createdAt: string;
};

// ---------- Orders (əmrlər) ----------

export type OrderTypeValue =
  | "Employment"
  | "Vacation"
  | "UnpaidLeave"
  | "VacationCompensation"
  | "EducationLeave"
  | "VacationReturn"
  | "ChangeOfPosition"
  | "EmploymentStatusChange"
  | "Bonus"
  | "SalaryDeduction"
  | "UnexcusedAbsence"
  | "Warning"
  | "WorkOnNonWorkday";

export const ORDER_TYPE_LABELS: Record<OrderTypeValue, string> = {
  Employment: "İşə qəbul",
  Vacation: "Məzuniyyət",
  UnpaidLeave: "Ödənişsiz icazə",
  VacationCompensation: "Məzuniyyət əvəzi",
  EducationLeave: "Təhsil icazəsi",
  VacationReturn: "Məzuniyyətdən geri qayıtma",
  ChangeOfPosition: "Vəzifə dəyişikliyi",
  EmploymentStatusChange: "İş rejimi dəyişikliyi",
  Bonus: "Mükafat",
  SalaryDeduction: "Maaşdan tutulma",
  UnexcusedAbsence: "İcazəsiz qeybət",
  Warning: "Xəbərdarlıq/Töhmət",
  WorkOnNonWorkday: "Bayram/istirahət günü işi",
};

/** Order types that can be issued directly, without an application first. */
export const DIRECT_ORDER_TYPES: { value: OrderTypeValue; label: string }[] = [
  { value: "Bonus", label: ORDER_TYPE_LABELS.Bonus },
  { value: "SalaryDeduction", label: ORDER_TYPE_LABELS.SalaryDeduction },
  { value: "UnexcusedAbsence", label: ORDER_TYPE_LABELS.UnexcusedAbsence },
  { value: "Warning", label: ORDER_TYPE_LABELS.Warning },
  { value: "WorkOnNonWorkday", label: ORDER_TYPE_LABELS.WorkOnNonWorkday },
];

export const ORDER_FIELD_SPECS: Partial<Record<OrderTypeValue, FieldSpec[]>> = {
  Bonus: [
    { key: "amount", label: "Məbləğ (₼)", kind: "number" },
    { key: "reason", label: "Səbəb", kind: "text" },
  ],
  SalaryDeduction: [
    { key: "amount", label: "Məbləğ (₼)", kind: "number" },
    { key: "reason", label: "Səbəb", kind: "text" },
  ],
  UnexcusedAbsence: [{ key: "date", label: "Tarix", kind: "date" }],
  Warning: [
    {
      key: "disciplinaryType",
      label: "Növ",
      kind: "select",
      options: ["Xəbərdarlıq", "Töhmət", "Ciddi töhmət"],
    },
    { key: "reason", label: "Səbəb", kind: "text" },
  ],
  WorkOnNonWorkday: [{ key: "date", label: "Tarix", kind: "date" }],
};

export type Order = {
  id: string;
  orderNumber: string;
  type: OrderTypeValue;
  employeeName?: string;
  fields: Record<string, string>;
  createdAt: string;
  fromApplicationNumber?: string;
};

// ---------- Local persistence (no backend yet — kept in the browser only) ----------

const APPLICATIONS_KEY = "mtk_hr_mock_applications";
const ORDERS_KEY = "mtk_hr_mock_orders";

export function loadApplications(): Application[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? (JSON.parse(raw) as Application[]) : [];
  } catch {
    return [];
  }
}

export function saveApplications(applications: Application[]) {
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function nextDocumentNumber(prefix: string, existingCount: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(existingCount + 1).padStart(3, "0")}`;
}
