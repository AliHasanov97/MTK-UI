import { apiFetch } from "./client";
import type { QueryFilter, SortCriteria } from "./buildings";

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

type ApiMessage = {
  success: boolean;
  statusCode: number;
  message: string;
};

// GarageType has no [JsonStringEnumConverter], so UpdateGarage (which binds
// the enum straight from the request body) needs the numeric ordinal.
// CreateGarage's own command takes the type as a plain string instead (see
// CreateGarageCommand), so only update needs this mapping.
export const GarageTypeOrdinal = {
  OpenParking: 0,
  CoveredGarage: 1,
  Storage: 2,
} as const;

export type GarageTypeKey = keyof typeof GarageTypeOrdinal;

export const GARAGE_TYPE_LABELS: Record<GarageTypeKey, string> = {
  OpenParking: "Açıq dayanacaq",
  CoveredGarage: "Örtülü qaraj",
  Storage: "Anbar yeri",
};

export type Garage = {
  id: string;
  garageNumber: string;
  type: string;
  description?: string | null;
  owner?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt?: string | null;
};

export function getGarageById(accessToken: string, id: string) {
  return apiFetch<ApiEnvelope<Garage>>(`api/buildings/garages/${id}`, accessToken).then(
    (envelope) => envelope.data,
  );
}

export type GarageListItem = {
  id: string;
  garageNumber: string;
  type: string;
  description?: string | null;
  owner?: { id: string; name: string } | null;
};

export type SearchGaragesParams = {
  filters?: QueryFilter[] | null;
  sortCriteria?: SortCriteria | null;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
};

export type SearchGaragesResult = {
  items: GarageListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchGarages(accessToken: string, params: SearchGaragesParams = {}) {
  return apiFetch<ApiEnvelope<SearchGaragesResult>>("api/buildings/garages/search", accessToken, {
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

export type CreateGarageRequest = {
  ownerId?: string | null;
  garageNumber: string;
  garageType: GarageTypeKey;
  description?: string | null;
};

export function createGarage(accessToken: string, request: CreateGarageRequest) {
  return apiFetch<ApiEnvelope<string>>("api/buildings/garages", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  }).then((envelope) => envelope.data);
}

export function updateGarage(
  accessToken: string,
  id: string,
  request: { type: GarageTypeKey; description?: string | null },
) {
  return apiFetch<ApiMessage>(`api/buildings/garages/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ type: GarageTypeOrdinal[request.type], description: request.description ?? null }),
  });
}

export function assignOwnerToGarage(accessToken: string, id: string, ownerId: string) {
  return apiFetch<ApiMessage>(`api/buildings/garages/${id}/assign-owner`, accessToken, {
    method: "POST",
    body: JSON.stringify({ ownerId }),
  });
}

export function removeOwnerFromGarage(accessToken: string, id: string) {
  return apiFetch<ApiMessage>(`api/buildings/garages/${id}/remove-owner`, accessToken, {
    method: "POST",
  });
}

export function deleteGarage(accessToken: string, id: string) {
  return apiFetch<ApiMessage>(`api/buildings/garages/${id}`, accessToken, { method: "DELETE" });
}
