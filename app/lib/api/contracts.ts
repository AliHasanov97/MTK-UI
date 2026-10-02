import { apiFetch } from "./client";
import { dateOnlyToUtcIso, searchBody, type SearchParams } from "./payments";

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal. These arrays are ordered to match the C# enums
// exactly — index = ordinal.
const CONTRACT_STATUSES = ["Draft", "Active", "Suspended", "Terminated"] as const;
const BILLING_PERIODS = ["Monthly", "Quarterly", "Yearly", "OneTime"] as const;

export type ContractStatusKey = (typeof CONTRACT_STATUSES)[number];
export type BillingPeriodKey = (typeof BILLING_PERIODS)[number];

export const contractStatusFromOrdinal = (n: number): ContractStatusKey => CONTRACT_STATUSES[n];
export const contractStatusToOrdinal = (k: ContractStatusKey) => CONTRACT_STATUSES.indexOf(k);
export const billingPeriodToOrdinal = (k: BillingPeriodKey) => BILLING_PERIODS.indexOf(k);
export const billingPeriodFromOrdinal = (n: number): BillingPeriodKey => BILLING_PERIODS[n];

export const CONTRACT_STATUS_LABELS: Record<ContractStatusKey, string> = {
  Draft: "Hazırlanır",
  Active: "Qüvvədədir",
  Suspended: "Dayandırılıb",
  Terminated: "Ləğv edilib",
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriodKey, string> = {
  Monthly: "Aylıq",
  Quarterly: "Rüblük",
  Yearly: "İllik",
  OneTime: "Birdəfəlik",
};

export const BILLING_PERIODS_ORDERED: BillingPeriodKey[] = [...BILLING_PERIODS];

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

export type ContractListItem = {
  id: string;
  number: string;
  vendorId: string;
  vendorName: string | null;
  startDate: string;
  endDate: string;
  status: number;
  isExpired: boolean;
  note: string | null;
  createdAt: string;
};

export type ContractServiceResponse = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  billingPeriod: number;
  periodAmount: number;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  paymentTermDays: number | null;
  isActive: boolean;
};

export type ContractResponse = {
  id: string;
  number: string;
  vendorId: string;
  vendorName: string | null;
  createdByUserId: string | null;
  startDate: string;
  endDate: string;
  status: number;
  note: string | null;
  isExpired: boolean;
  isActive: boolean;
  monthlyAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string | null;
  services: ContractServiceResponse[];
};

export type SearchContractsResult = {
  contracts: ContractListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchContracts(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchContractsResult>>("api/payments/contracts/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export function getContract(accessToken: string, contractId: string) {
  return apiFetch<Envelope<ContractResponse>>(`api/payments/contracts/${contractId}`, accessToken).then(
    (e) => e.data,
  );
}

export type CreateContractRequest = {
  number: string;
  vendorId: string;
  startDate: string;
  endDate: string;
  createdByUserId?: string | null;
  note?: string | null;
};

export function createContract(accessToken: string, request: CreateContractRequest) {
  return apiFetch<Envelope<string>>("api/payments/contracts", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      // A calendar-date picker has no time-of-day meaning: pin to UTC midnight,
      // otherwise Npgsql rejects the local-midnight timestamp (see payments.ts).
      startDate: dateOnlyToUtcIso(request.startDate),
      endDate: dateOnlyToUtcIso(request.endDate),
    }),
  }).then((e) => e.data);
}

export function updateContract(
  accessToken: string,
  contractId: string,
  request: { startDate: string; endDate: string; note?: string | null },
) {
  return apiFetch<MessageOnly>(`api/payments/contracts/${contractId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({
      ...request,
      startDate: dateOnlyToUtcIso(request.startDate),
      endDate: dateOnlyToUtcIso(request.endDate),
    }),
  });
}

export type ContractServiceRequest = {
  name: string;
  unitPrice: number;
  billingPeriod: BillingPeriodKey;
  description?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  paymentTermDays?: number | null;
};

function serviceBody(request: ContractServiceRequest) {
  return JSON.stringify({
    ...request,
    billingPeriod: billingPeriodToOrdinal(request.billingPeriod),
    serviceStartDate: request.serviceStartDate ? dateOnlyToUtcIso(request.serviceStartDate) : null,
    serviceEndDate: request.serviceEndDate ? dateOnlyToUtcIso(request.serviceEndDate) : null,
  });
}

export function addContractService(
  accessToken: string,
  contractId: string,
  request: ContractServiceRequest,
) {
  return apiFetch<Envelope<string>>(`api/payments/contracts/${contractId}/services`, accessToken, {
    method: "POST",
    body: serviceBody(request),
  }).then((e) => e.data);
}

export function updateContractService(
  accessToken: string,
  contractId: string,
  serviceId: string,
  request: ContractServiceRequest,
) {
  return apiFetch<MessageOnly>(
    `api/payments/contracts/${contractId}/services/${serviceId}`,
    accessToken,
    { method: "PUT", body: serviceBody(request) },
  );
}

export function removeContractService(accessToken: string, contractId: string, serviceId: string) {
  return apiFetch<MessageOnly>(
    `api/payments/contracts/${contractId}/services/${serviceId}`,
    accessToken,
    { method: "DELETE" },
  );
}

export function setContractServiceStatus(
  accessToken: string,
  contractId: string,
  serviceId: string,
  isActive: boolean,
) {
  return apiFetch<MessageOnly>(
    `api/payments/contracts/${contractId}/services/${serviceId}/status`,
    accessToken,
    { method: "PUT", body: JSON.stringify({ isActive }) },
  );
}

export function activateContract(accessToken: string, contractId: string) {
  return apiFetch<MessageOnly>(`api/payments/contracts/${contractId}/activate`, accessToken, {
    method: "POST",
  });
}

export function suspendContract(accessToken: string, contractId: string, note?: string | null) {
  return apiFetch<MessageOnly>(`api/payments/contracts/${contractId}/suspend`, accessToken, {
    method: "POST",
    body: JSON.stringify({ note: note ?? null }),
  });
}

export function terminateContract(
  accessToken: string,
  contractId: string,
  terminatedOn: string,
  note?: string | null,
) {
  return apiFetch<MessageOnly>(`api/payments/contracts/${contractId}/terminate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ terminatedOn: dateOnlyToUtcIso(terminatedOn), note: note ?? null }),
  });
}

export function deleteContract(accessToken: string, contractId: string) {
  return apiFetch<MessageOnly>(`api/payments/contracts/${contractId}`, accessToken, {
    method: "DELETE",
  });
}
