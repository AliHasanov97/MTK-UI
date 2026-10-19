import { apiFetch } from "./client";
import type { SearchParams } from "./payments";
import { searchBody } from "./payments";

type Envelope<T> = { data: T; message: string };

// Enums
export enum AppealStatus {
  Submitted = 1,
  InProgress = 2,
  Resolved = 3,
  Closed = 4,
  Rejected = 5,
}

export enum AppealCategory {
  Maintenance = 1,
  Technical = 2,
  Financial = 3,
  Cleanliness = 4,
  Security = 5,
  Parking = 6,
  Noise = 7,
  General = 8,
}

export enum AppealPriority {
  Normal = 1,
  High = 2,
  Urgent = 3,
}

// Response types
export type AppealListItem = {
  id: string;
  title: string;
  category: AppealCategory;
  status: AppealStatus;
  priority: AppealPriority;
  submitterId: string;
  submitterName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string | null;
  commentsCount: number;
};

export type AppealComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

export type AppealDetail = {
  id: string;
  title: string;
  description: string;
  category: AppealCategory;
  status: AppealStatus;
  priority: AppealPriority;
  submitterId: string;
  submitterName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  apartmentId: string | null;
  apartmentLabel: string | null;
  garageId: string | null;
  garageLabel: string | null;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  comments: AppealComment[];
};

export type SearchAppealsResult = {
  appeals: AppealListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

// Request types
export type CreateAppealRequest = {
  title: string;
  description: string;
  category: AppealCategory;
  apartmentId?: string;
  garageId?: string;
};

// API functions
// Backend yaratma cavabında yeni ID-ni zərfsiz (sadə JSON mətni: "guid") qaytarır, çünki
// AppealsController `Created(uri, id)` ilə ASP.NET-in öz Created metodunu çağırır; digər endpoint-lər
// isə { data, message } zərfindədir. İkisini də qəbul edirik ki, backend zərfə keçsə, bu qırılmasın.
export function createAppeal(accessToken: string, request: CreateAppealRequest): Promise<string> {
  return apiFetch<string | Envelope<string>>("api/appeals", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  }).then((res) => {
    const id = typeof res === "string" ? res : res?.data;
    if (!id) throw new Error("Server yeni müraciətin ID-sini qaytarmadı.");
    return id;
  });
}

export function searchAppeals(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchAppealsResult>>("api/appeals/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export function getAppealById(accessToken: string, id: string) {
  return apiFetch<Envelope<AppealDetail>>(`api/appeals/${id}`, accessToken).then((e) => e.data);
}

export function updateAppealStatus(accessToken: string, id: string, newStatus: AppealStatus) {
  return apiFetch<Envelope<string>>(`api/appeals/${id}/status`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ newStatus }),
  }).then((e) => e.data);
}

export function assignAppeal(accessToken: string, id: string, assignedToId: string) {
  return apiFetch<Envelope<string>>(`api/appeals/${id}/assign`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ assignedToId }),
  }).then((e) => e.data);
}

export function addComment(accessToken: string, appealId: string, text: string) {
  return apiFetch<Envelope<string>>(`api/appeals/${appealId}/comments`, accessToken, {
    method: "POST",
    body: JSON.stringify({ text }),
  }).then((e) => e.data);
}

// Label helpers
export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  [AppealStatus.Submitted]: "Təqdim edilib",
  [AppealStatus.InProgress]: "İşlənir",
  [AppealStatus.Resolved]: "Həll edilib",
  [AppealStatus.Closed]: "Bağlanıb",
  [AppealStatus.Rejected]: "Rədd edilib",
};

export const APPEAL_CATEGORY_LABELS: Record<AppealCategory, string> = {
  [AppealCategory.Maintenance]: "Təmir-bərpa",
  [AppealCategory.Technical]: "Texniki",
  [AppealCategory.Financial]: "Maliyyə",
  [AppealCategory.Cleanliness]: "Təmizlik",
  [AppealCategory.Security]: "Təhlükəsizlik",
  [AppealCategory.Parking]: "Dayanacaq",
  [AppealCategory.Noise]: "Səs-küy",
  [AppealCategory.General]: "Ümumi",
};

export const APPEAL_PRIORITY_LABELS: Record<AppealPriority, string> = {
  [AppealPriority.Normal]: "Normal",
  [AppealPriority.High]: "Yüksək",
  [AppealPriority.Urgent]: "Təcili",
};

export function appealStatusLabel(status: AppealStatus): string {
  return APPEAL_STATUS_LABELS[status] || String(status);
}

export function appealCategoryLabel(category: AppealCategory): string {
  return APPEAL_CATEGORY_LABELS[category] || String(category);
}

export function appealPriorityLabel(priority: AppealPriority): string {
  return APPEAL_PRIORITY_LABELS[priority] || String(priority);
}

// Sinif adları üçün (appeals.css): status və prioritet rəngləri CSS-də, işıqlı/tund rejimə görə.
export function appealStatusClass(status: AppealStatus): string {
  return `ap-chip ap-status-${status}`;
}

export function appealPriorityClass(priority: AppealPriority): string {
  return `ap-chip ap-prio-${priority}`;
}

/** Müraciətçinin hələ cavab gözləyən (açıq) müraciəti: Təqdim edilib və ya İşlənir. */
export function isAppealOpen(status: AppealStatus): boolean {
  return status === AppealStatus.Submitted || status === AppealStatus.InProgress;
}
