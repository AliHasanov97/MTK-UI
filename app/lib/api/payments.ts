import { apiFetch, apiFetchFile } from "./client";
import type { QueryFilter, SortCriteria } from "./buildings";

// Postgres "timestamp with time zone" columns (via Npgsql) only accept
// DateTimeOffset.Offset == 0 (UTC). A bare "yyyy-MM-dd" from <input type="date">
// parses server-side as midnight in the SERVER's local zone (e.g. +04:00 here),
// which Npgsql then rejects outright — this failed for real on rate/payment
// dates. A calendar-date picker has no time-of-day meaning anyway, so pin it to
// UTC midnight before it ever reaches the API.
export function dateOnlyToUtcIso(value: string): string {
  return value.length === 10 ? `${value}T00:00:00.000Z` : value;
}

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal (both ways: in responses, and in request bodies).
// These arrays are ordered to match the C# enum declarations exactly — index = ordinal.
const PROPERTY_TYPES = ["Apartment", "Garage"] as const;
const CHARGE_STATUSES = ["Unpaid", "PartiallyPaid", "Paid", "Cancelled"] as const;
const PAYMENT_METHODS = ["Cash", "BankTransfer", "Card"] as const;
const PAYMENT_STATUSES = ["Pending", "Completed"] as const;
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
export const propertyTypeFromOrdinal = (n: number): PropertyTypeKey => PROPERTY_TYPES[n];
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
  Cancelled: "Ləğv edilib",
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
  apartmentId: string | null;
  garageId: string | null;
  period: string | null;
  amount: number;
  paidAmount: number;
  status: number;
  createdAt: string;
  // The debt's age — FIFO order and the "settled from advance" marker derive from it.
  issuedOn: string;
  description: string | null;
  // Snapshot of how Amount was calculated (see Charge.RateAmount/RateType).
  // Nullable now that owner and vendor charges share one aggregate.
  areaSquareMeters: number | null;
  rateAmount: number | null;
  rateType: number | null;
  // Resolved server-side from Payments' own Owner/Vendor/Apartment/Garage shadows —
  // no need to separately fetch from Buildings/Identity just to label a charge.
  partyName: string | null;
  propertyLabel: string | null;
};

export type PaymentResponse = {
  id: string;
  // Shared response for both owner and vendor payments — exactly one of
  // ownerId/vendorId is set.
  ownerId: string | null;
  vendorId: string | null;
  amount: number;
  paymentMethod: number;
  paymentDate: string;
  status: number;
  notes: string | null;
  createdAt: string;
  apartmentId: string | null;
  garageId: string | null;
  // Resolved server-side from Payments' own Owner/Vendor/Apartment/Garage shadows —
  // no need to separately fetch from Buildings/Identity just to label a payment.
  partyName: string | null;
  propertyLabel: string | null;
};

export type PaymentAllocationDetailResponse = {
  id: string;
  chargeId: string;
  apartmentId: string | null;
  garageId: string | null;
  period: string | null;
  description: string | null;
  chargeAmount: number;
  allocatedAmount: number;
  // Bu haqqın (chargeId) qalıq borcu bu paylanma tətbiq olunandan dərhal sonra.
  // Server-side snapshot, sonradan dəyişmir (PaymentAllocation.RemainingDebtAfterPayment).
  remainingDebtAfterPayment: number;
  // Resolved server-side from the Apartment/Garage shadow (see payments.ts above).
  propertyLabel: string | null;
};

// The company's real-time net cash position (all-time income minus all-time
// expense), recalculated server-side every time a transaction is posted — not
// a "balance as of a chosen past month" (a printed report for an old month
// still has to scan that month's ledger; see UmumiHesabatView).
export type CompanyBalanceResponse = {
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
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
  id: string;
  paymentId: string;
  allocatedAmount: number;
  paymentDate: string;
  paymentStatus: string;
  // Bu haqqın öz qalıq borcu bu konkret paylanma tətbiq olunandan dərhal sonra.
  remainingDebtAfterPayment: number;
  // true — əvvəlki avansdan bağlanıb; false — elə bu ödənişin özündən birbaşa.
  // Server-side fakt (hansı allocation yolu istifadə olunub), tarix təxmini deyil.
  isFromAdvance: boolean;
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

export function searchBody(params: SearchParams) {
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

export type GenerateChargesResult = {
  period: string;
  residentChargesCreated: number;
  apartmentsSkippedNoRate: number;
  garagesSkippedNoRate: number;
  vendorChargesCreated: number;
};

/** Verilmiş dövr ("yyyy-MM") üçün borcları əl ilə yaradır (yalnız admin; idempotentdir). */
export function generateChargesForPeriod(accessToken: string, period: string) {
  return apiFetch<Envelope<GenerateChargesResult>>("api/payments/charges/generate", accessToken, {
    method: "POST",
    body: JSON.stringify({ period }),
  }).then((e) => e.data);
}

export type SearchPaymentsResult = { payments: PaymentResponse[]; totalCount: number; page: number; pageSize: number };

export function searchPayments(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchPaymentsResult>>("api/payments/payments/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

// General ledger entries. Most rows are written by the backend only: a resident
// payment posts an income row and a vendor payment an expense row on creation
// (payments are not reversible, so there is no reversal entry). createTransaction
// below is the one deliberate exception — a manual entry for a cost/income with
// no charge or vendor behind it (a utility bill paid by hand, etc.).
export type TransactionDocumentType = "Purchase" | "ResidentPayment" | "VendorPayment" | "LedgerEntry";

export type TransactionResponse = {
  id: string;
  direction: number;
  category: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  createdAt: string;
  // Set only for a row auto-posted from a resident/vendor payment — the related
  // document (receipt) is that Payment's own FileAttachment(s), found by this id.
  // Null for a manual entry (Xərc/Əlavə gəlir), which instead carries its own
  // FileAttachment keyed directly by this row's own id (via FileAttachmentTarget.transactionId).
  sourcePaymentId: string | null;
  sourcePurchaseId: string | null;
  documentType: TransactionDocumentType;
  referenceId: string;
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

export function getPayment(accessToken: string, paymentId: string) {
  return apiFetch<Envelope<PaymentResponse>>(`api/payments/payments/${paymentId}`, accessToken).then(
    (e) => e.data,
  );
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
  user: { id: string; name: string } | null;
  timestamp: string;
};

export type SearchAuditLogsResult = {
  auditLogs: AuditLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchAuditLogs(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchAuditLogsResult>>("api/payments/auditlogs/search", accessToken, {
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

// No transactionDate here: the ledger stamps it server-side (DateTimeOffset.UtcNow)
// — a client-supplied creation date would be a backdating/forging risk.
export type CreateTransactionRequest = {
  direction: TransactionDirectionKey;
  category: string;
  amount: number;
  description?: string | null;
};

export function createTransaction(accessToken: string, request: CreateTransactionRequest) {
  return apiFetch<Envelope<string>>("api/payments/transactions", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      direction: transactionDirectionToOrdinal(request.direction),
    }),
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
  // Exactly one of the two must be set.
  apartmentId?: string | null;
  garageId?: string | null;
  amount: number;
  description: string;
  period?: string | null;
};

export function createCharge(accessToken: string, request: CreateChargeRequest) {
  return apiFetch<Envelope<string>>("api/payments/charges", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  }).then((e) => e.data);
}

// Charges against a contract's own OneTime (birdəfəlik) service: creates the vendor
// charge and completes a payment against it in one step, so Xərclər keeps a single
// "I paid this today" action while the balance/ledger are backed by a real
// Contract/ContractService-linked Charge instead of a free-text category.
// No expenseDate here: the handler stamps both the charge and the payment with
// DateTimeOffset.UtcNow server-side.
export type CreateOneTimeServiceExpenseRequest = {
  contractId: string;
  contractServiceId: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  notes?: string | null;
};

export function createOneTimeServiceExpense(accessToken: string, request: CreateOneTimeServiceExpenseRequest) {
  return apiFetch<Envelope<string>>("api/payments/charges/one-time-service-expense", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      paymentMethod: paymentMethodToOrdinal(request.paymentMethod),
    }),
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

export function getPaymentsByVendor(accessToken: string, vendorId: string) {
  return apiFetch<Envelope<PaymentResponse[]>>(`api/payments/vendorpayments/vendor/${vendorId}`, accessToken).then(
    (e) => e.data,
  );
}

// No paymentDate here: the handler stamps it server-side (DateTimeOffset.UtcNow).
export type CreatePaymentRequest = {
  ownerId: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  notes?: string | null;
  // Scope the payment to one apartment/garage so it can't spill onto the
  // owner's other unpaid debt. Omit both for a general, owner-wide payment.
  apartmentId?: string | null;
  garageId?: string | null;
};

export function createPayment(accessToken: string, request: CreatePaymentRequest) {
  return apiFetch<Envelope<string>>("api/payments/payments", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      paymentMethod: paymentMethodToOrdinal(request.paymentMethod),
    }),
  }).then((e) => e.data);
}

export function getPaymentAllocations(accessToken: string, paymentId: string) {
  return apiFetch<Envelope<PaymentAllocationDetailResponse[]>>(
    `api/payments/payments/${paymentId}/allocations`,
    accessToken,
  ).then((e) => e.data);
}

// Everything on the receipt (payer name, apartment/garage number, billing period,
// building address, issuer name/role) is resolved server-side from Payments' own data —
// the frontend only ever sends the payment id.
export function exportPaymentReceipt(accessToken: string, paymentId: string) {
  return apiFetchFile(`api/payments/payments/${paymentId}/receipt`, accessToken);
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

export function getCompanyBalance(accessToken: string) {
  return apiFetch<Envelope<CompanyBalanceResponse>>("api/payments/balances/company", accessToken).then(
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

// Null means no active charge existed for that property that month (never billed,
// or every charge for it was cancelled) — distinct from Unpaid, a real debt.
export type MonthlyChargeSummary = {
  month: number;
  amount: number;
  paidAmount: number;
  status: number | null;
};

export type PropertyAnnualReportRow = {
  propertyId: string;
  propertyType: number;
  months: MonthlyChargeSummary[];
  // All-time outstanding debt for this property (not scoped to the report year).
  currentDebt: number;
};

export type AnnualPaymentReportResponse = {
  year: number;
  properties: PropertyAnnualReportRow[];
};

export function getAnnualPaymentReport(accessToken: string, year: number, propertyType?: PropertyTypeKey | null) {
  const params = new URLSearchParams({ year: String(year) });
  if (propertyType) params.set("propertyType", String(propertyTypeToOrdinal(propertyType)));
  return apiFetch<Envelope<AnnualPaymentReportResponse>>(
    `api/payments/charges/reports/annual?${params.toString()}`,
    accessToken,
  ).then((e) => e.data);
}

export function exportAnnualPaymentReport(accessToken: string, year: number, propertyType?: PropertyTypeKey | null) {
  const params = new URLSearchParams({ year: String(year) });
  if (propertyType) params.set("propertyType", String(propertyTypeToOrdinal(propertyType)));
  return apiFetchFile(`api/payments/charges/reports/annual/export?${params.toString()}`, accessToken);
}
