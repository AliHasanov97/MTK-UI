import { apiFetch } from "./client";
import { searchBody, type SearchParams } from "./payments";

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal (both ways: in responses, and in request bodies).
// This array is ordered to match the CustomerType C# enum exactly — index = ordinal.
const CUSTOMER_TYPES = ["LegalEntity", "Individual", "SoleProprietor"] as const;

export type CustomerTypeKey = (typeof CUSTOMER_TYPES)[number];

export const customerTypeToOrdinal = (k: CustomerTypeKey) => CUSTOMER_TYPES.indexOf(k);
export const customerTypeFromOrdinal = (n: number): CustomerTypeKey => CUSTOMER_TYPES[n];

export const CUSTOMER_TYPE_LABELS: Record<CustomerTypeKey, string> = {
  LegalEntity: "Hüquqi şəxs",
  Individual: "Fiziki şəxs",
  SoleProprietor: "Fərdi sahibkar",
};

export const CUSTOMER_TYPES_ORDERED: CustomerTypeKey[] = [...CUSTOMER_TYPES];

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

export type CustomerListResult = {
  id: string;
  name: string;
  customerType: number;
  voen: string | null;
  director: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CustomerResponse = CustomerListResult & {
  note: string | null;
  updatedAt: string | null;
};

export type SearchCustomersResult = {
  customers: CustomerListResult[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchCustomers(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchCustomersResult>>("api/payments/customers/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export function getCustomer(accessToken: string, customerId: string) {
  return apiFetch<Envelope<CustomerResponse>>(`api/payments/customers/${customerId}`, accessToken).then(
    (e) => e.data,
  );
}

export type CustomerBalanceResponse = {
  customerId: string;
  /** Açıq borcların qalığı — müştəri bizə bu qədər borcludur. */
  outstandingDebt: number;
  /** Borca bölünməmiş ödəniş qalığı; növbəti borc yaranan kimi avtomatik tətbiq olunur. */
  advance: number;
  totalPaid: number;
};

export function getCustomerBalance(accessToken: string, customerId: string) {
  return apiFetch<Envelope<CustomerBalanceResponse>>(`api/payments/customers/${customerId}/balance`, accessToken).then(
    (e) => e.data,
  );
}

export type SaveCustomerRequest = {
  name: string;
  customerType: CustomerTypeKey;
  voen?: string | null;
  director?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
};

export function createCustomer(accessToken: string, request: SaveCustomerRequest) {
  return apiFetch<Envelope<string>>("api/payments/customers", accessToken, {
    method: "POST",
    body: JSON.stringify({ ...request, customerType: customerTypeToOrdinal(request.customerType) }),
  }).then((e) => e.data);
}

export function updateCustomer(accessToken: string, customerId: string, request: SaveCustomerRequest) {
  return apiFetch<MessageOnly>(`api/payments/customers/${customerId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ ...request, customerType: customerTypeToOrdinal(request.customerType) }),
  });
}

export function setCustomerStatus(accessToken: string, customerId: string, isActive: boolean) {
  return apiFetch<MessageOnly>(`api/payments/customers/${customerId}/status`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ isActive }),
  });
}

export function deleteCustomer(accessToken: string, customerId: string) {
  return apiFetch<MessageOnly>(`api/payments/customers/${customerId}`, accessToken, {
    method: "DELETE",
  });
}
