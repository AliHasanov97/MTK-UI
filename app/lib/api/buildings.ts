import { apiFetch } from "./client";

export type Building = {
  id: string;
  name: string;
  fullAddress: string;
  totalFloors: number;
  apartmentsPerFloor: number;
  totalApartments: number;
  status: string;
  description?: string | null;
};

export type ResponseObjectWithName = {
  id: string;
  name: string;
};

export type Apartment = {
  id: string;
  building: ResponseObjectWithName;
  apartmentNumber: string;
  floor: number;
  areaSquareMeters: number;
  roomCount: number;
  status: string;
  currentOwner?: ResponseObjectWithName | null;
};

export function listBuildings(accessToken: string) {
  return apiFetch<Building[]>("api/buildings/buildings", accessToken);
}

export function getBuilding(accessToken: string, id: string) {
  return apiFetch<Building>(`api/buildings/buildings/${id}`, accessToken);
}

export type CreateBuildingRequest = {
  name: string;
  street: string;
  city: string;
  district?: string | null;
  totalFloors: number;
  apartmentsPerFloor: number;
  description?: string | null;
};

export function createBuilding(accessToken: string, request: CreateBuildingRequest) {
  return apiFetch<string>("api/buildings/buildings", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export type CreateApartmentRequest = {
  buildingId: string;
  apartmentNumber: string;
  floor: number;
  areaSquareMeters: number;
  roomCount: number;
};

export function createApartment(accessToken: string, request: CreateApartmentRequest) {
  return apiFetch<string>("api/buildings/apartments", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function assignOwnerToApartment(accessToken: string, apartmentId: string, ownerId: string) {
  return apiFetch<void>(`api/buildings/apartments/${apartmentId}/assign-owner`, accessToken, {
    method: "POST",
    body: JSON.stringify({ ownerId }),
  });
}

// No transferDate/salePrice/notes: a transfer always takes effect now — the
// backend stamps the date itself (then snaps it to the 1st of that month).
export type TransferApartmentOwnershipRequest = {
  newOwnerId: string;
};

export function transferApartmentOwnership(
  accessToken: string,
  apartmentId: string,
  request: TransferApartmentOwnershipRequest,
) {
  return apiFetch<void>(`api/buildings/apartments/${apartmentId}/transfer-ownership`, accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function listApartmentsByBuilding(accessToken: string, buildingId: string) {
  return apiFetch<Apartment[]>(
    `api/buildings/apartments/building/${buildingId}`,
    accessToken,
  );
}

export function getApartmentById(accessToken: string, id: string) {
  return apiFetch<Apartment>(`api/buildings/apartments/${id}`, accessToken);
}

// Mülkiyyət transfer tarixçəsi — "Mülkiyyəti icra edən" sualına cavab üçün hər
// qeydin öz Id-si (useCreatedBy ilə AuditLogs-dan adı tapmaq üçün) daşıyır.
export type OwnershipHistoryDto = {
  id: string;
  previousOwnerId: string | null;
  previousOwnerName: string | null;
  newOwnerId: string;
  newOwnerName: string;
  transferDate: string;
};

export function getOwnershipHistory(accessToken: string, apartmentId: string) {
  return apiFetch<OwnershipHistoryDto[]>(`api/buildings/apartments/${apartmentId}/ownership-history`, accessToken);
}

// The list endpoint above fetches one building's apartments at a time (raw,
// unwrapped JSON). searchApartments below is the newer, dedicated endpoint —
// server-side search/sort/filter/pagination in a single POST call, wrapped
// in the {success,statusCode,message,data} envelope the Buildings module
// has moved its newer endpoints to.
type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

// Backend has no JsonStringEnumConverter registered, so enums serialize as
// their plain numeric ordinal over JSON bodies (query-string enum binding is
// a separate, string-tolerant code path — this is not that). These mirror
// MTK.Common.Domain.Queries.QueryComparisonType / SortDirection exactly; if
// the backend enum order ever changes, these must be updated to match.
export const QueryComparisonType = {
  Equals: 0,
  NotEquals: 1,
  Contains: 2,
  StartsWith: 3,
  EndsWith: 4,
  GreaterThan: 5,
  GreaterThanOrEqual: 6,
  LessThan: 7,
  LessThanOrEqual: 8,
  IsNull: 9,
  IsNotNull: 10,
  In: 11,
  NotIn: 12,
} as const;

export const SortDirection = {
  Ascending: 0,
  Descending: 1,
} as const;

export type QueryFilter = {
  columnName: string;
  comparison: (typeof QueryComparisonType)[keyof typeof QueryComparisonType];
  value?: unknown;
};

export type SortCriteria = {
  columnName: string;
  direction: (typeof SortDirection)[keyof typeof SortDirection];
};

export type SearchApartmentsParams = {
  filters?: QueryFilter[] | null;
  sortCriteria?: SortCriteria | null;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
};

export type SearchApartmentsResult = {
  items: Apartment[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchApartments(accessToken: string, params: SearchApartmentsParams = {}) {
  return apiFetch<ApiEnvelope<SearchApartmentsResult>>("api/buildings/apartments/search", accessToken, {
    method: "POST",
    body: JSON.stringify({
      filters: params.filters ?? null,
      sortCriteria: params.sortCriteria ?? null,
      searchTerm: params.searchTerm ?? null,
      page: params.page ?? null,
      pageSize: params.pageSize ?? null,
    }),
  }).then((envelope) => envelope.data);
}

// Kim yaradıb/dəyişdirib — hər entity dəyişikliyi avtomatik (EF SaveChanges
// interceptor-u ilə) bu moduldakı AuditLogs cədvəlinə yazılır; user backend-də
// artıq adı ResponseObjectWithName kimi oxunur, burda ayrıca sorğuya ehtiyac yoxdur.
export type AuditLogDto = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: string | null;
  newValues: string | null;
  user: ResponseObjectWithName | null;
  timestamp: string;
};

export type SearchAuditLogsResult = {
  auditLogs: AuditLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchAuditLogs(accessToken: string, params: SearchApartmentsParams = {}) {
  return apiFetch<ApiEnvelope<SearchAuditLogsResult>>("api/buildings/auditlogs/search", accessToken, {
    method: "POST",
    body: JSON.stringify({
      filters: params.filters ?? null,
      sortCriteria: params.sortCriteria ?? null,
      searchTerm: params.searchTerm ?? null,
      page: params.page ?? null,
      pageSize: params.pageSize ?? null,
    }),
  }).then((envelope) => envelope.data);
}
