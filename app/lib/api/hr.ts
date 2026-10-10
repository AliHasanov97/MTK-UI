import { apiFetch, apiFetchFile, apiUploadFile, saveBlobAsFile } from "./client";
import { dateOnlyToUtcIso, searchBody, type SearchParams } from "./payments";

// HR API (fivestar HR modulunun portu). Enum-lar rəqəm kimi gedib-gəlir (JsonStringEnumConverter yoxdur),
// ərizə statusu isə string-dir ("PendingApproval" / "ConvertedToOrder").

type Envelope<T> = { data: T; message: string };

export type Paged<T> = { data: T[]; page: number; pageSize: number; pageCount: number; totalCount: number };
export type NamedRef = { id: string; name: string };

/** <input type="date"> dəyərini DateTimeOffset sahəsi üçün UTC ISO-ya çevirir (boşdursa null). */
export function toIso(value: string | null | undefined): string | null {
  return value ? dateOnlyToUtcIso(value) : null;
}

/** ISO tarixdən <input type="date"> üçün "yyyy-MM-dd". */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

const get = <T>(token: string, path: string) =>
  apiFetch<Envelope<T>>(path, token).then((e) => e.data);

const send = <T>(token: string, method: string, path: string, body?: unknown) =>
  apiFetch<Envelope<T>>(path, token, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((e) => e.data);

// Bəzi HR axtarış sorğularında (ISearchQuery) page/pageSize null ola bilmir — həmişə rəqəm göndərilir.
const search = <T>(token: string, path: string, params: SearchParams = {}) =>
  send<Paged<T>>(
    token,
    "POST",
    path,
    JSON.parse(searchBody({ ...params, page: params.page ?? 0, pageSize: params.pageSize ?? 100 })),
  );

/* ------------------------------------------------------------------ */
/* Enum-lar                                                            */
/* ------------------------------------------------------------------ */

export type Option = { value: number; label: string };

export const GENDERS: Option[] = [
  { value: 1, label: "Kişi" },
  { value: 2, label: "Qadın" },
];
export const MARITAL_STATUSES: Option[] = [
  { value: 0, label: "Subay" },
  { value: 1, label: "Evli" },
];
export const MILITARY_SERVICES: Option[] = [
  { value: 1, label: "Xidmət etməyib" },
  { value: 2, label: "Xidmət edib" },
  { value: 3, label: "Hərbi xidmətdən azaddır" },
];
export const EDUCATION_LEVELS: Option[] = [
  { value: 0, label: "Yoxdur" },
  { value: 1, label: "Ali (bakalavr)" },
  { value: 2, label: "Ali (magistr)" },
  { value: 3, label: "Ali (doktorantura)" },
  { value: 4, label: "Ümumi orta" },
  { value: 5, label: "Tam orta" },
  { value: 6, label: "İlk peşə-ixtisas" },
  { value: 7, label: "Orta ixtisas" },
  { value: 8, label: "Orta ixtisas (ümumi orta əsasında)" },
  { value: 9, label: "Orta ixtisas (tam orta əsasında)" },
  { value: 10, label: "Ali (natamam, 1993-dən əvvəl)" },
  { value: 11, label: "Ali (tam, 1997-dən əvvəl)" },
];
export const EMPLOYMENT_TYPES: Option[] = [
  { value: 1, label: "Tam ştat" },
  { value: 2, label: "Yarım ştat" },
];
export const EMPLOYEE_STATUSES: Option[] = [
  { value: 1, label: "Aktiv" },
  { value: 2, label: "Qeyri-aktiv" },
];
export const WORKING_DAYS: Option[] = [
  { value: 1, label: "5 günlük iş həftəsi" },
  { value: 2, label: "6 günlük iş həftəsi" },
];
export const DISCIPLINARY_TYPES: Option[] = [
  { value: 1, label: "Xəbərdarlıq" },
  { value: 2, label: "Töhmət" },
  { value: 3, label: "Ciddi töhmət" },
];
export const INSTITUTION_TYPES: Option[] = [
  { value: 1, label: "Ali məktəb" },
  { value: 2, label: "Kollec" },
];
export const CALENDAR_DAY_TYPES: Option[] = [
  { value: 1, label: "Bayram" },
  { value: 2, label: "İş günü" },
  { value: 3, label: "Qeyri-iş günü" },
];

export function optionLabel(options: Option[], value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return options.find((o) => o.value === value)?.label ?? String(value);
}

/** Ərizə növləri (ApplicationType ordinalı, controller marşrutu, əmr növü). */
export const APPLICATION_KINDS = {
  JobApplication: { value: 1, route: "jobapplications", label: "Vakansiyaya müraciət" },
  ChangeOfPosition: { value: 2, route: "applicationsforchangeofposition", label: "Vəzifə dəyişikliyi" },
  VacationCompensation: { value: 3, route: "vacationcompensationapplications", label: "Məzuniyyət əvəzi" },
  UnpaidLeave: { value: 4, route: "unpaidleaveapplications", label: "Ödənişsiz məzuniyyət" },
  Vacation: { value: 5, route: "vacationapplications", label: "Əmək məzuniyyəti" },
  EducationLeave: { value: 6, route: "educationleaveapplications", label: "Təhsil məzuniyyəti" },
  EmploymentStatusChange: { value: 7, route: "employmentstatuschangeapplications", label: "İş rejimi dəyişikliyi" },
  VacationReturn: { value: 8, route: "vacationreturnapplications", label: "Məzuniyyətdən geri çağırma" },
} as const;
export type ApplicationKind = keyof typeof APPLICATION_KINDS;

export function applicationKindFromValue(value: number): ApplicationKind | undefined {
  return (Object.keys(APPLICATION_KINDS) as ApplicationKind[]).find((k) => APPLICATION_KINDS[k].value === value);
}

/** Əmr növləri (OrderType ordinalı və controller marşrutu). */
export const ORDER_KINDS = {
  Employment: { value: 1, route: "employmentorders", label: "İşə qəbul", pdf: true },
  ChangeOfPosition: { value: 2, route: "ordersforchangeofposition", label: "Vəzifə dəyişikliyi", pdf: true },
  UnexcusedAbsence: { value: 3, route: "unexcusedabsences", label: "İcazəsiz qeyb", pdf: true },
  Warning: { value: 4, route: "warnings", label: "Xəbərdarlıq", pdf: true },
  VacationCompensation: { value: 5, route: "compensationorders", label: "Məzuniyyət əvəzi", pdf: true },
  UnpaidLeave: { value: 6, route: "unpaidleaveorders", label: "Ödənişsiz məzuniyyət", pdf: true },
  Vacation: { value: 7, route: "vacationorders", label: "Əmək məzuniyyəti", pdf: true },
  EducationLeave: { value: 8, route: "educationleaveorders", label: "Təhsil məzuniyyəti", pdf: true },
  Reprimand: { value: 9, route: "warnings", label: "Töhmət", pdf: true },
  SevereReprimand: { value: 10, route: "warnings", label: "Ciddi töhmət", pdf: true },
  Bonus: { value: 11, route: "bonusorders", label: "Mükafat", pdf: true },
  SalaryDeduction: { value: 12, route: "salarydeductions", label: "Maaşdan tutulma", pdf: true },
  WorkOnNonWorkday: { value: 13, route: "workonnonworkdayorders", label: "İstirahət/bayram günü işi", pdf: true },
  EmploymentStatusChange: { value: 14, route: "employmentstatuschangeorders", label: "İş rejimi dəyişikliyi", pdf: true },
  VacationReturn: { value: 15, route: "vacationreturnorders", label: "Məzuniyyətdən geri çağırma", pdf: true },
} as const;
export type OrderKind = keyof typeof ORDER_KINDS;

export function orderKindFromValue(value: number): OrderKind | undefined {
  return (Object.keys(ORDER_KINDS) as OrderKind[]).find((k) => ORDER_KINDS[k].value === value);
}

/* ------------------------------------------------------------------ */
/* Vəzifələr və təhsil ocaqları (lüğətlər)                             */
/* ------------------------------------------------------------------ */

export type Job = { id: string; name: string; createdAt: string; updatedAt: string | null };

export const searchJobs = (token: string, params?: SearchParams) => search<Job>(token, "api/hr/jobs/search", params);
export const createJob = (token: string, name: string) => send<Job>(token, "POST", "api/hr/jobs", { name });
export const updateJob = (token: string, id: string, name: string) =>
  send<Job>(token, "PATCH", `api/hr/jobs/${id}`, { name });
export const deleteJob = (token: string, id: string) => send<unknown>(token, "DELETE", `api/hr/jobs/${id}`);

export type EducationalInstitution = { id: string; name: string; type: number };

export const searchInstitutions = (token: string, params?: SearchParams) =>
  search<EducationalInstitution>(token, "api/hr/educationalinstitutions/search", params);
export const createInstitution = (token: string, body: { name: string; type: number }) =>
  send<EducationalInstitution>(token, "POST", "api/hr/educationalinstitutions", body);
export const updateInstitution = (token: string, id: string, body: { name: string; type: number }) =>
  send<EducationalInstitution>(token, "PATCH", `api/hr/educationalinstitutions/${id}`, body);
export const deleteInstitution = (token: string, id: string) =>
  send<unknown>(token, "DELETE", `api/hr/educationalinstitutions/${id}`);

export type LaborCodeCase = { id: string; code: string; name: string; parentId: string | null; parentName: string | null; isActive: boolean };
export const searchLaborCodeCases = (token: string, params?: SearchParams) =>
  search<LaborCodeCase>(token, "api/hr/laborcodecases/search", params);

/* ------------------------------------------------------------------ */
/* İşçilər                                                             */
/* ------------------------------------------------------------------ */

export type EmployeeListItem = {
  id: string;
  registerNumber: number;
  name: string;
  surname: string;
  fathersName: string;
  gender: number;
  birthDate: string | null;
  age: number | null;
  finCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  education: number | null;
  maritalStatus: number | null;
  startWorkDate: string;
  job: NamedRef | null;
  isActive: number;
  employmentType: number;
  createdAt: string;
};

export type WorkExperience = { years: number; months: number; days: number };

export type EmployeeDetail = {
  id: string;
  registerNumber: number;
  name: string;
  surname: string;
  fathersName: string;
  nationality: string | null;
  gender: number;
  birthDate: string | null;
  finCode: string | null;
  idCardNumber: string | null;
  socialSecurityNumber: string | null;
  contractNumber: string | null;
  salaryBankName: string | null;
  employeeBankAccountNumber: string | null;
  maritalStatus: number | null;
  numberOfChildren: number | null;
  childrenUnder14Count: number | null;
  militaryService: number | null;
  veteran: boolean;
  disability: boolean;
  isKarabakhWorker: boolean;
  isSingleParent: boolean;
  hasDisabledChild: boolean;
  education: number | null;
  phoneNumber: string | null;
  homePhoneNumber: string | null;
  email: string | null;
  registeredAddress: string | null;
  currentAddress: string | null;
  workingDays: number | null;
  vacationDays: number;
  totalWorkExperience: WorkExperience | null;
  organizationWorkExperience: WorkExperience | null;
  startWorkDate: string;
  job: NamedRef | null;
  isActive: number;
  employmentType: number;
  employmentOrderId: string | null;
  createdBy: NamedRef | null;
  createdAt: string;
  updatedAt: string | null;
};

export type EmployeeForm = {
  name: string;
  surname: string;
  fathersName: string;
  gender: number;
  startWorkDate: string;
  jobId: string;
  nationality: string;
  birthDate: string;
  finCode: string;
  idCardNumber: string;
  socialSecurityNumber: string;
  contractNumber: string;
  salaryBankName: string;
  employeeBankAccountNumber: string;
  maritalStatus: string;
  numberOfChildren: string;
  childrenUnder14Count: string;
  militaryService: string;
  veteran: boolean;
  disability: boolean;
  isKarabakhWorker: boolean;
  isSingleParent: boolean;
  hasDisabledChild: boolean;
  education: string;
  phoneNumber: string;
  homePhoneNumber: string;
  email: string;
  registeredAddress: string;
  currentAddress: string;
  workingDays: string;
  vacationDays: string;
  employmentType: number;
  isActive: number;
};

const str = (v: string) => (v.trim() === "" ? null : v.trim());
const num = (v: string) => (v.trim() === "" ? null : Number(v));

function employeeBody(f: EmployeeForm) {
  return {
    name: f.name.trim(),
    surname: f.surname.trim(),
    fathersName: f.fathersName.trim(),
    gender: f.gender,
    nationality: str(f.nationality),
    birthDate: toIso(f.birthDate),
    finCode: str(f.finCode),
    idCardNumber: str(f.idCardNumber),
    socialSecurityNumber: str(f.socialSecurityNumber),
    contractNumber: str(f.contractNumber),
    salaryBankName: str(f.salaryBankName),
    employeeBankAccountNumber: str(f.employeeBankAccountNumber),
    maritalStatus: num(f.maritalStatus),
    numberOfChildren: num(f.numberOfChildren),
    childrenUnder14Count: num(f.childrenUnder14Count),
    militaryService: num(f.militaryService),
    veteran: f.veteran,
    disability: f.disability,
    isKarabakhWorker: f.isKarabakhWorker,
    isSingleParent: f.isSingleParent,
    hasDisabledChild: f.hasDisabledChild,
    education: num(f.education),
    phoneNumber: str(f.phoneNumber),
    homePhoneNumber: str(f.homePhoneNumber),
    email: str(f.email),
    registeredAddress: str(f.registeredAddress),
    currentAddress: str(f.currentAddress),
    workingDays: num(f.workingDays),
    vacationDays: num(f.vacationDays),
    employmentType: f.employmentType,
  };
}

export const searchEmployees = (token: string, params?: SearchParams) =>
  search<EmployeeListItem>(token, "api/hr/employees/search", params);
export const getEmployee = (token: string, id: string) => get<EmployeeDetail>(token, `api/hr/employees/${id}`);
export const createEmployee = (token: string, f: EmployeeForm) =>
  send<{ id: string }>(token, "POST", "api/hr/employees", {
    ...employeeBody(f),
    jobId: f.jobId,
    startWorkDate: toIso(f.startWorkDate),
  });
/**
 * İşçinin yalnız verilən bölməsini (sahə açarları) yeniləyir. Backend PATCH yalnız `null` olmayan sahələri tətbiq edir,
 * ona görə mətn sahəsi təmizlənirsə boş sətir ("") göndərilir; tarix/rəqəm sahələri boşdursa göndərilmir.
 */
export const updateEmployeeSection = (token: string, id: string, f: EmployeeForm, keys: (keyof EmployeeForm)[]) => {
  const dateKeys: (keyof EmployeeForm)[] = ["birthDate", "startWorkDate"];
  const numberKeys: (keyof EmployeeForm)[] = [
    "maritalStatus", "numberOfChildren", "childrenUnder14Count", "militaryService", "education", "workingDays", "vacationDays",
  ];
  const body: Record<string, unknown> = { id };
  for (const key of keys) {
    const value = f[key];
    if (typeof value === "boolean" || typeof value === "number") {
      body[key] = value;
    } else if (dateKeys.includes(key)) {
      if (value) body[key] = toIso(value);
    } else if (numberKeys.includes(key)) {
      if (value.trim() !== "") body[key] = Number(value);
    } else {
      body[key] = value.trim();
    }
  }
  return send<unknown>(token, "PATCH", `api/hr/employees/${id}`, body);
};
export const deleteEmployee = (token: string, id: string) => send<unknown>(token, "DELETE", `api/hr/employees/${id}`);

export type WorkHistory = {
  id: string;
  companyName: string;
  position: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  duration: WorkExperience;
};
export const getWorkHistories = (token: string, employeeId: string) =>
  get<{ data: WorkHistory[] } | WorkHistory[]>(token, `api/hr/employeeworkhistories/employee/${employeeId}`).then((r) =>
    Array.isArray(r) ? r : r.data,
  );
export const addWorkHistory = (
  token: string,
  body: { employeeId: string; companyName: string; position: string; startDate: string; endDate: string; notes: string },
) =>
  send<unknown>(token, "POST", "api/hr/employeeworkhistories", {
    ...body,
    startDate: toIso(body.startDate),
    endDate: toIso(body.endDate),
    notes: str(body.notes),
  });
export const deleteWorkHistory = (token: string, id: string) =>
  send<unknown>(token, "DELETE", `api/hr/employeeworkhistories/${id}`);

export type EducationHistory = {
  id: string;
  educationalInstitutionId: string;
  educationalInstitutionName: string | null;
  educationLevel: number;
  faculty: string;
  specialty: string | null;
  startDate: string;
  endDate: string | null;
  diplomaNumber: string | null;
  registerNumber: string | null;
};
export const getEducationHistories = (token: string, employeeId: string) =>
  get<{ data: EducationHistory[] } | EducationHistory[]>(token, `api/hr/employeeeducationhistories/employee/${employeeId}`).then(
    (r) => (Array.isArray(r) ? r : r.data),
  );
export const addEducationHistory = (
  token: string,
  body: {
    employeeId: string;
    educationalInstitutionId: string;
    educationLevel: number;
    faculty: string;
    specialty: string;
    startDate: string;
    endDate: string;
    diplomaNumber: string;
    registerNumber: string;
  },
) =>
  send<unknown>(token, "POST", "api/hr/employeeeducationhistories", {
    ...body,
    specialty: str(body.specialty),
    startDate: toIso(body.startDate),
    endDate: toIso(body.endDate),
    diplomaNumber: str(body.diplomaNumber),
    registerNumber: str(body.registerNumber),
  });
export const deleteEducationHistory = (token: string, id: string) =>
  send<unknown>(token, "DELETE", `api/hr/employeeeducationhistories/${id}`);

export type WorkSchedule = {
  id: string | null;
  effectiveFrom: string | null;
  monday: number | null;
  tuesday: number | null;
  wednesday: number | null;
  thursday: number | null;
  friday: number | null;
  saturday: number | null;
  sunday: number | null;
};
export const getWorkSchedule = (token: string, employeeId: string) =>
  get<WorkSchedule>(token, `api/hr/employeeworkschedules/employee/${employeeId}`);
export const setWorkSchedule = (token: string, employeeId: string, hours: Omit<WorkSchedule, "id" | "effectiveFrom">) =>
  send<unknown>(token, "PATCH", `api/hr/employeeworkschedules/employee/${employeeId}`, hours);

/* ------------------------------------------------------------------ */
/* Ərizələr                                                            */
/* ------------------------------------------------------------------ */

export type ApplicationItem = {
  id: string;
  applicationNumber: number;
  type: number;
  employee: NamedRef | null;
  jobApplicant: NamedRef | null;
  createdBy: NamedRef | null;
  order: NamedRef | null;
  status: string;
  createdAt: string;
};

export const searchApplications = (token: string, params?: SearchParams) =>
  search<ApplicationItem>(token, "api/hr/applications/search", params);

export function createApplication(token: string, kind: ApplicationKind, body: Record<string, unknown>) {
  return send<unknown>(token, "POST", `api/hr/${APPLICATION_KINDS[kind].route}`, body);
}

export function deleteApplication(token: string, kind: ApplicationKind, id: string) {
  return send<unknown>(token, "DELETE", `api/hr/${APPLICATION_KINDS[kind].route}/${id}`);
}

/** Ərizəni təsdiqləyib əmrə çevirir (vakansiyaya müraciətdə əlavə məlumat lazımdır). */
export function convertApplication(
  token: string,
  kind: ApplicationKind,
  id: string,
  body?: { startDate: string; endDate: string; laborCodeCaseId: string },
) {
  if (kind === "JobApplication") {
    return send<unknown>(token, "POST", `api/hr/jobapplications/${id}/convert-to-employment-order`, {
      startDate: toIso(body?.startDate),
      endDate: toIso(body?.endDate),
      laborCodeCaseId: body?.laborCodeCaseId,
    });
  }
  return send<unknown>(token, "POST", `api/hr/${APPLICATION_KINDS[kind].route}/${id}/convert-to-order`);
}

/* ------------------------------------------------------------------ */
/* Əmrlər                                                              */
/* ------------------------------------------------------------------ */

export type OrderItem = {
  id: string;
  orderNumber: number;
  type: number;
  employee: NamedRef | null;
  jobApplicant: NamedRef | null;
  createdBy: NamedRef | null;
  createdAt: string;
};

export const searchOrders = (token: string, params?: SearchParams) =>
  search<OrderItem>(token, "api/hr/orders/search", params);

export type DirectOrderKind = "Bonus" | "SalaryDeduction" | "UnexcusedAbsence" | "Warning" | "WorkOnNonWorkday";

export function createDirectOrder(token: string, kind: DirectOrderKind, body: Record<string, unknown>) {
  return send<unknown>(token, "POST", `api/hr/${ORDER_KINDS[kind].route}`, body);
}

/* ------------------------------------------------------------------ */
/* PDF / Word / Excel yükləmə                                          */
/* ------------------------------------------------------------------ */

export async function downloadFile(token: string, path: string) {
  const { blob, fileName } = await apiFetchFile(path, token);
  saveBlobAsFile(blob, fileName);
}

/** Ərizə növünə uyğun yaranan əmr növü. */
export const ORDER_FOR_APPLICATION: Record<ApplicationKind, OrderKind> = {
  JobApplication: "Employment",
  ChangeOfPosition: "ChangeOfPosition",
  VacationCompensation: "VacationCompensation",
  UnpaidLeave: "UnpaidLeave",
  Vacation: "Vacation",
  EducationLeave: "EducationLeave",
  EmploymentStatusChange: "EmploymentStatusChange",
  VacationReturn: "VacationReturn",
};

/** Backend-də silmə endpoint-i olan əmr növləri. */
export const DELETABLE_ORDERS: OrderKind[] = [
  "Employment", "ChangeOfPosition", "UnexcusedAbsence", "Warning", "Reprimand", "SevereReprimand",
  "VacationCompensation", "UnpaidLeave", "EducationLeave", "Bonus", "SalaryDeduction", "WorkOnNonWorkday",
  "EmploymentStatusChange",
];

/** Ərizə və ya əmrin tam məlumatı (detal pəncərəsi üçün) — sahələr növə görə dəyişir. */
export type DocumentDetail = Record<string, unknown>;
export const getApplicationDetail = (token: string, kind: ApplicationKind, id: string) =>
  get<DocumentDetail>(token, `api/hr/${APPLICATION_KINDS[kind].route}/${id}`);
export const getOrderDetail = (token: string, kind: OrderKind, id: string) =>
  get<DocumentDetail>(token, `api/hr/${ORDER_KINDS[kind].route}/${id}`);
export const deleteOrder = (token: string, kind: OrderKind, id: string) =>
  send<unknown>(token, "DELETE", `api/hr/${ORDER_KINDS[kind].route}/${id}`);

export const downloadApplicationPdf = (token: string, kind: ApplicationKind, id: string) =>
  downloadFile(token, `api/hr/${APPLICATION_KINDS[kind].route}/${id}/export-pdf`);

export const downloadOrderPdf = (token: string, kind: OrderKind, id: string) =>
  downloadFile(token, `api/hr/${ORDER_KINDS[kind].route}/${id}/export-pdf`);

/* ------------------------------------------------------------------ */
/* Tabel                                                               */
/* ------------------------------------------------------------------ */

export type TimesheetDay = { date: string; day: number; dayType: string; dayCode: string; workedHours: number | null };
export type EmployeeTimesheet = {
  employee: NamedRef;
  position: NamedRef | null;
  registerNumber: number;
  days: TimesheetDay[];
  actualWorkingDays: number;
  actualWorkedHours: number;
  normWorkingDays: number;
  normWorkedHours: number;
  annualLeaveDays: number;
  socialLeaveDays: number;
  educationLeaveDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  businessTripDays: number;
  holidayDays: number;
  nonWorkingDays: number;
};
export type Timesheet = { year: number; month: number; daysInMonth: number; employees: EmployeeTimesheet[] };

export const getTimesheet = (token: string, year: number, month: number) =>
  get<Timesheet>(token, `api/hr/timesheets?year=${year}&month=${month}`);
export const downloadTimesheet = (token: string, year: number, month: number) =>
  downloadFile(token, `api/hr/timesheets/export?year=${year}&month=${month}`);

/* ------------------------------------------------------------------ */
/* Təqvim                                                            */
/* ------------------------------------------------------------------ */

export type CalendarDay = {
  id: string;
  name: string;
  date: string;
  year: number;
  dayType: number;
  reason: string | null;
  applicableWorkingDays: number | null;
};

export type CalendarMonth = {
  month: number;
  monthName: string;
  totalDays: number;
  workingDays: number;
  nonWorkingDays: number;
  nonWorkingDaysList: CalendarDay[];
  days: CalendarDay[];
};
export type CalendarYear = {
  year: number;
  months: CalendarMonth[];
  yearTotal: { totalDays: number; workingDays: number; nonWorkingDays: number };
};

export const getCalendarYear = (token: string, year: number, workingDays: number) =>
  get<CalendarYear>(token, `api/hr/calendardays?year=${year}&workingDays=${workingDays}`);

export type CalendarDayForm = {
  name: string;
  date: string;
  dayType: number;
  reason: string;
  applicableWorkingDays: string;
};
const calendarBody = (f: CalendarDayForm) => ({
  name: f.name.trim(),
  date: f.date,
  dayType: f.dayType,
  reason: str(f.reason),
  applicableWorkingDays: num(f.applicableWorkingDays),
});
export const createCalendarDay = (token: string, f: CalendarDayForm) =>
  send<CalendarDay>(token, "POST", "api/hr/calendardays", calendarBody(f));
export const updateCalendarDay = (token: string, id: string, f: CalendarDayForm) =>
  send<CalendarDay>(token, "PATCH", `api/hr/calendardays/${id}`, calendarBody(f));
export const deleteCalendarDay = (token: string, id: string) => send<unknown>(token, "DELETE", `api/hr/calendardays/${id}`);

export type BulkCalendarDayItem = {
  name: string;
  date: string;
  dayType: number;
  reason: string;
  applicableWorkingDays: number | null;
};
export type BulkCalendarResult = { createdCount: number; skippedDates: string[] };
export const bulkCreateCalendarDays = (token: string, days: BulkCalendarDayItem[]) =>
  send<BulkCalendarResult>(token, "POST", "api/hr/calendardays/bulk", {
    days: days.map((d) => ({ ...d, name: d.name.trim(), reason: str(d.reason) })),
  });

/* ------------------------------------------------------------------ */
/* İmzalanmış sənədlər (fayl əlavələri)                                */
/* ------------------------------------------------------------------ */

export type HrFileAttachment = { id: string; fileName: string; mimeType: string; createdAt: string; documentType: number | null };

/** Fayl əlavəsinin bağlandığı sütun (FileAttachment FK) — ərizə/əmr növünə görə. */
export const APPLICATION_ATTACHMENT_FK: Record<ApplicationKind, string> = {
  JobApplication: "JobApplicationId",
  ChangeOfPosition: "ApplicationForChangeOfPositionId",
  VacationCompensation: "VacationCompensationApplicationId",
  UnpaidLeave: "UnpaidLeaveApplicationId",
  Vacation: "VacationApplicationId",
  EducationLeave: "EducationLeaveApplicationId",
  EmploymentStatusChange: "EmploymentStatusChangeApplicationId",
  VacationReturn: "VacationReturnApplicationId",
};
export const ORDER_ATTACHMENT_FK: Record<OrderKind, string> = {
  Employment: "EmploymentOrderId",
  ChangeOfPosition: "OrderForChangeOfPositionId",
  UnexcusedAbsence: "UnexcusedAbsenceId",
  Warning: "WarningId",
  Reprimand: "WarningId",
  SevereReprimand: "WarningId",
  VacationCompensation: "CompensationOrderId",
  UnpaidLeave: "UnpaidLeaveOrderId",
  Vacation: "VacationOrderId",
  EducationLeave: "EducationLeaveOrderId",
  Bonus: "BonusOrderId",
  SalaryDeduction: "SalaryDeductionId",
  WorkOnNonWorkday: "WorkOnNonWorkdayOrderId",
  EmploymentStatusChange: "EmploymentStatusChangeOrderId",
  VacationReturn: "VacationReturnOrderId",
};

const SIGNED_DOCUMENT_TYPE = 10;

export const listAttachments = (token: string, fkColumn: string, id: string) =>
  send<Paged<HrFileAttachment>>(token, "POST", "api/hr/fileattachments/search", {
    filters: [{ columnName: fkColumn, comparison: 0, value: id }],
    sortCriteria: { columnName: "CreatedAt", direction: 1 },
    page: 0,
    pageSize: 100,
  }).then((r) => r.data);

export function uploadAttachment(token: string, file: File, fkColumn: string, id: string) {
  const form = new FormData();
  form.append("File", file);
  form.append(fkColumn, id);
  form.append("DocumentType", String(SIGNED_DOCUMENT_TYPE));
  return apiUploadFile<unknown>("api/hr/fileattachments", token, form);
}

export const getAttachmentBlob = (token: string, id: string) => apiFetchFile(`api/hr/fileattachments/${id}/download`, token);
export const downloadAttachment = async (token: string, id: string) => {
  const { blob, fileName } = await getAttachmentBlob(token, id);
  saveBlobAsFile(blob, fileName);
};
// Backend 204 (boş cavab) qaytarır, ona görə `send` (JSON zərfi gözləyir) əvəzinə birbaşa apiFetch
export const deleteAttachment = (token: string, id: string) =>
  apiFetch<void>(`api/hr/fileattachments/${id}`, token, { method: "DELETE" });
