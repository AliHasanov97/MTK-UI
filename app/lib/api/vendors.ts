import { apiFetch } from "./client";
import { searchBody, type SearchParams } from "./payments";

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal (both ways: in responses, and in request bodies).
// This array is ordered to match the VendorType C# enum exactly — index = ordinal.
const VENDOR_TYPES = ["LegalEntity", "Individual", "SoleProprietor"] as const;

export type VendorTypeKey = (typeof VENDOR_TYPES)[number];

export const vendorTypeToOrdinal = (k: VendorTypeKey) => VENDOR_TYPES.indexOf(k);
export const vendorTypeFromOrdinal = (n: number): VendorTypeKey => VENDOR_TYPES[n];

export const VENDOR_TYPE_LABELS: Record<VendorTypeKey, string> = {
  LegalEntity: "Hüquqi şəxs",
  Individual: "Fiziki şəxs",
  SoleProprietor: "Fərdi sahibkar",
};

export const VENDOR_TYPES_ORDERED: VendorTypeKey[] = [...VENDOR_TYPES];

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

export type VendorListResult = {
  id: string;
  name: string;
  vendorType: number;
  voen: string | null;
  director: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export type VendorResponse = VendorListResult & {
  note: string | null;
  updatedAt: string | null;
};

export type SearchVendorsResult = {
  vendors: VendorListResult[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchVendors(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchVendorsResult>>("api/payments/vendors/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export function getVendor(accessToken: string, vendorId: string) {
  return apiFetch<Envelope<VendorResponse>>(`api/payments/vendors/${vendorId}`, accessToken).then(
    (e) => e.data,
  );
}

export type SaveVendorRequest = {
  name: string;
  vendorType: VendorTypeKey;
  voen?: string | null;
  director?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
};

export function createVendor(accessToken: string, request: SaveVendorRequest) {
  return apiFetch<Envelope<string>>("api/payments/vendors", accessToken, {
    method: "POST",
    body: JSON.stringify({ ...request, vendorType: vendorTypeToOrdinal(request.vendorType) }),
  }).then((e) => e.data);
}

export function updateVendor(accessToken: string, vendorId: string, request: SaveVendorRequest) {
  return apiFetch<MessageOnly>(`api/payments/vendors/${vendorId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ ...request, vendorType: vendorTypeToOrdinal(request.vendorType) }),
  });
}

export function setVendorStatus(accessToken: string, vendorId: string, isActive: boolean) {
  return apiFetch<MessageOnly>(`api/payments/vendors/${vendorId}/status`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ isActive }),
  });
}

export function deleteVendor(accessToken: string, vendorId: string) {
  return apiFetch<MessageOnly>(`api/payments/vendors/${vendorId}`, accessToken, {
    method: "DELETE",
  });
}
