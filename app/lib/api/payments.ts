import { apiFetch } from "./client";
import type { QueryFilter, SortCriteria } from "./buildings";

// Postgres "timestamp with time zone" columns (via Npgsql) only accept
// DateTimeOffset.Offset == 0 (UTC). A bare "yyyy-MM-dd" from <input type="date">
// parses server-side as midnight in the SERVER's local zone (e.g. +04:00 here),
// which Npgsql then rejects outright — this failed for real on rate/payment
// dates. A calendar-date picker has no time-of-day meaning anyway, so pin it to
// UTC midnight before it ever reaches the API.
function dateOnlyToUtcIso(value: string): string {
  return value.length === 10 ? `${value}T00:00:00.000Z` : value;
}

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal (both ways: in responses, and in request bodies).
// These arrays are ordered to match the C# enum declarations exactly — index = ordinal.
const PROPERTY_TYPES = ["Apartment", "Garage"] as const;
const CHARGE_STATUSES = ["Unpaid", "PartiallyPaid", "Paid"] as const;
const PAYMENT_METHODS = ["Cash", "BankTransfer", "Card"] as const;
const PAYMENT_STATUSES = ["Pending", "Completed", "Cancelled"] as const;
const RATE_TYPES = ["PerSquareMeter", "FixedGarage", "Manual"] as const;
const GARAGE_TYPES = ["OpenParking", "CoveredGarage", "Storage"] as const;
const TRANSACTION_DIRECTIONS = ["Income", "Expense"] as const;

export type PropertyTypeKey = (typeof PROPERTY_TYPES)[number];
export type ChargeStatusKey = (typeof CHARGE_STATUSES)[number];
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number];
export type PaymentStatusKey = (typeof PAYMENT_STATUSES)[number];
export type RateTypeKey = (typeof RATE_TYPES)[number];
export type GarageTypeKey = (typeof GARAGE_TYPES)[number];
export type TransactionDirectionKey = (typeof TRANSACTION_DIRECTIONS)[number];

export const propertyTypeToOrdinal = (k: PropertyTypeKey) => PROPERTY_TYPES.indexOf(k);
export const chargeStatusFromOrdinal = (n: number): ChargeStatusKey => CHARGE_STATUSES[n];
export const paymentMethodToOrdinal = (k: PaymentMethodKey) => PAYMENT_METHODS.indexOf(k);
export const paymentMethodFromOrdinal = (n: number): PaymentMethodKey => PAYMENT_METHODS[n];
export const paymentStatusFromOrdinal = (n: number): PaymentStatusKey => PAYMENT_STATUSES[n];
export const rateTypeToOrdinal = (k: RateTypeKey) => RATE_TYPES.indexOf(k);
export const rateTypeFromOrdinal = (n: number): RateTypeKey => RATE_TYPES[n];
export const garageTypeToOrdinal = (k: GarageTypeKey) => GARAGE_TYPES.indexOf(k);
export const transactionDirectionToOrdinal = (k: TransactionDirectionKey) => TRANSACTION_DIRECTIONS.indexOf(k);
export const transactionDirectionFromOrdinal = (n: number): TransactionDirectionKey => TRANSACTION_DIRECTIONS[n];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  Cash: "Nağd",
  BankTransfer: "Bank köçürməsi",
  Card: "Kart",
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatusKey, string> = {
  Unpaid: "Ödənilməyib",
  PartiallyPaid: "Qismən ödənilib",
  Paid: "Ödənilib",
};

export const RATE_TYPE_LABELS: Record<RateTypeKey, string> = {
  PerSquareMeter: "m² üzrə (mənzil)",
  FixedGarage: "Sabit (qaraj)",
  Manual: "Manual (bir dəfəlik haqqlar üçün, birbaşa yaradılmır)",
};

export const TRANSACTION_DIRECTION_LABELS: Record<TransactionDirectionKey, string> = {
  Income: "Gəlir",
  Expense: "Xərc",
};

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

export type ChargeResponse = {
  id: string;
  ownerId: string;
  propertyType: number;
  propertyId: string;
  period: string;
  amount: number;
  paidAmount: number;
  status: number;
  createdAt: string;
  description: string | null;
  // Snapshot of how Amount was calculated (see Charge.RateAmount/RateType).
  areaSquareMeters: number | null;
  rateAmount: number;
  rateType: number;
};

export type PaymentResponse = {
  id: string;
  ownerId: string;
  amount: number;
  paymentMethod: number;
  paymentDate: string;
  status: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  propertyId: string | null;
  propertyType: number | null;
};

export type PaymentAllocationDetailResponse = {
  chargeId: string;
  propertyType: number;
  propertyId: string;
  period: string;
  description: string | null;
  chargeAmount: number;
  allocatedAmount: number;
};

export type OwnerBalanceResponse = {
  id: string;
  ownerId: string;
  totalDebt: number;
  totalPaid: number;
  // The single source of truth for the owner's advance/debt. Positive means
  // credit sitting at the owner level (never on any one property — see
  // PropertyBalanceResponse), automatically spent down as soon as a new charge
  // is created for any of their apartments/garages.
  currentBalance: number;
};

export type PropertyBalanceResponse = {
  propertyId: string;
  totalDebt: number;
  totalPaid: number;
  currentBalance: number;
};

export type ChargeAllocationResponse = {
  paymentId: string;
  allocatedAmount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentStatus: string;
  reference: string | null;
};

export type RateResponse = {
  id: string;
  rateType: number;
  amount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  description: string | null;
  garageType: number | null;
};

export type SearchParams = {
  filters?: QueryFilter[] | null;
  sortCriteria?: SortCriteria | null;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
};

function searchBody(params: SearchParams) {
  return JSON.stringify({
    filters: params.filters ?? null,
    sortCriteria: params.sortCriteria ?? null,
    searchTerm: params.searchTerm ?? null,
    page: params.page ?? null,
    pageSize: params.pageSize ?? null,
  });
}

export type SearchChargesResult = { charges: ChargeResponse[]; totalCount: number; page: number; pageSize: number };

export function searchCharges(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchChargesResult>>("api/payments/charges/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export type SearchPaymentsResult = { payments: PaymentResponse[]; totalCount: number; page: number; pageSize: number };

export function searchPayments(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchPaymentsResult>>("api/payments/payments/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

// General ledger entries — written by the backend only: a resident payment posts an
// income row on creation, and cancelling that payment posts the matching reversal.
// There is deliberately no create transaction call (the ledger is append-only).
export type TransactionResponse = {
  id: string;
  direction: number;
  category: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  createdAt: string;
};

export type SearchTransactionsResult = {
  transactions: TransactionResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchTransactions(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchTransactionsResult>>("api/payments/transactions/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export type TransactionsSummaryResponse = { totalIncome: number; totalExpense: number; net: number };

export function getTransactionsSummary(accessToken: string, filters?: QueryFilter[] | null) {
  return apiFetch<Envelope<TransactionsSummaryResponse>>("api/payments/transactions/summary", accessToken, {
    method: "POST",
    body: JSON.stringify({ filters: filters ?? null }),
  }).then((e) => e.data);
}

export function getChargesByOwner(accessToken: string, ownerId: string) {
  return apiFetch<Envelope<ChargeResponse[]>>(`api/payments/charges/owner/${ownerId}`, accessToken).then(
    (e) => e.data,
  );
}

export function getChargeAllocations(accessToken: string, chargeId: string) {
  return apiFetch<Envelope<ChargeAllocationResponse[]>>(
    `api/payments/charges/${chargeId}/allocations`,
    accessToken,
  ).then((e) => e.data);
}

export type CreateChargeRequest = {
  ownerId: string;
  propertyType: PropertyTypeKey;
  propertyId: string;
  amount: number;
  description: string;
  period?: string | null;
};

export function createCharge(accessToken: string, request: CreateChargeRequest) {
  return apiFetch<Envelope<string>>("api/payments/charges", accessToken, {
    method: "POST",
    body: JSON.stringify({ ...request, propertyType: propertyTypeToOrdinal(request.propertyType) }),
  }).then((e) => e.data);
}

export function getPaymentsByOwner(accessToken: string, ownerId: string) {
  return apiFetch<Envelope<PaymentResponse[]>>(`api/payments/payments/owner/${ownerId}`, accessToken).then(
    (e) => e.data,
  );
}

export function getPaymentsByProperty(accessToken: string, propertyId: string) {
  return apiFetch<Envelope<PaymentResponse[]>>(`api/payments/payments/property/${propertyId}`, accessToken).then(
    (e) => e.data,
  );
}

export type CreatePaymentRequest = {
  ownerId: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  // Scope the payment to one apartment/garage so it can't spill onto the
  // owner's other unpaid debt. Omit for a general, owner-wide payment.
  propertyId?: string | null;
  propertyType?: PropertyTypeKey | null;
};

export function createPayment(accessToken: string, request: CreatePaymentRequest) {
  return apiFetch<Envelope<string>>("api/payments/payments", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      paymentDate: dateOnlyToUtcIso(request.paymentDate),
      paymentMethod: paymentMethodToOrdinal(request.paymentMethod),
      propertyType: request.propertyType ? propertyTypeToOrdinal(request.propertyType) : null,
    }),
  }).then((e) => e.data);
}

export function cancelPayment(accessToken: string, paymentId: string) {
  return apiFetch<MessageOnly>(`api/payments/payments/${paymentId}/cancel`, accessToken, {
    method: "POST",
  });
}

export function getPaymentAllocations(accessToken: string, paymentId: string) {
  return apiFetch<Envelope<PaymentAllocationDetailResponse[]>>(
    `api/payments/payments/${paymentId}/allocations`,
    accessToken,
  ).then((e) => e.data);
}

export function getOwnerBalance(accessToken: string, ownerId: string) {
  return apiFetch<Envelope<OwnerBalanceResponse>>(`api/payments/balances/owner/${ownerId}`, accessToken).then(
    (e) => e.data,
  );
}

export function getPropertyBalance(accessToken: string, propertyId: string) {
  return apiFetch<Envelope<PropertyBalanceResponse>>(`api/payments/balances/property/${propertyId}`, accessToken).then(
    (e) => e.data,
  );
}

export function getCurrentRates(accessToken: string) {
  return apiFetch<Envelope<RateResponse[]>>("api/payments/rates/current", accessToken).then((e) => e.data);
}

export type CreateRateRequest = {
  rateType: RateTypeKey;
  amount: number;
  effectiveFrom: string;
  description?: string | null;
  garageType?: GarageTypeKey | null;
};

export function createRate(accessToken: string, request: CreateRateRequest) {
  return apiFetch<Envelope<string>>("api/payments/rates", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      effectiveFrom: dateOnlyToUtcIso(request.effectiveFrom),
      rateType: rateTypeToOrdinal(request.rateType),
      garageType: request.garageType ? garageTypeToOrdinal(request.garageType) : null,
    }),
  }).then((e) => e.data);
}

export function updateRate(accessToken: string, rateId: string, request: { amount: number; description?: string | null }) {
  return apiFetch<MessageOnly>(`api/payments/rates/${rateId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}
