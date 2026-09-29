import { apiFetch } from "./client";
import type { QueryFilter, SortCriteria } from "./buildings";

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

export type OwnedApartment = {
  id: string;
  building: { id: string; name: string };
  apartmentNumber: string;
  floor: number;
  areaSquareMeters: number;
  roomCount: number;
  status: string;
};

export type OwnedGarage = {
  id: string;
  garageNumber: string;
  type: string;
  description?: string | null;
};

export type Owner = {
  id: string;
  userId?: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  apartments: OwnedApartment[];
  garages: OwnedGarage[];
};

export function getOwnerById(accessToken: string, id: string) {
  return apiFetch<Owner>(`api/buildings/owners/${id}`, accessToken);
}

export type OwnerListItem = {
  id: string;
  userId?: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
};

export type SearchOwnersParams = {
  filters?: QueryFilter[] | null;
  sortCriteria?: SortCriteria | null;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
};

export type SearchOwnersResult = {
  items: OwnerListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchOwners(accessToken: string, params: SearchOwnersParams = {}) {
  return apiFetch<ApiEnvelope<SearchOwnersResult>>("api/buildings/owners/search", accessToken, {
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

export type CreatePassiveOwnerRequest = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  notes?: string | null;
};

export function createPassiveOwner(accessToken: string, request: CreatePassiveOwnerRequest) {
  return apiFetch<string>("api/buildings/owners/passive", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

type ApiMessage = {
  success: boolean;
  statusCode: number;
  message: string;
};

export function linkOwnerToUser(accessToken: string, ownerId: string, userId: string) {
  return apiFetch<ApiMessage>(`api/buildings/owners/${ownerId}/link-user`, accessToken, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}
