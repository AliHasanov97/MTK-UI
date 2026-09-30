import { apiFetch } from "./client";
import { dateOnlyToUtcIso, searchBody, type SearchParams } from "./payments";

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal. These arrays are ordered to match the C# enums
// exactly — index = ordinal.
const VENDOR_CHARGE_STATUSES = ["Unpaid", "PartiallyPaid", "Paid", "Cancelled"] as const;
const VENDOR_CHARGE_SOURCES = ["ServiceSchedule", "GoodsDelivery", "Manual"] as const;
const PAYMENT_METHODS = ["Cash", "BankTransfer", "Card"] as const;

export type VendorChargeStatusKey = (typeof VENDOR_CHARGE_STATUSES)[number];
export type VendorChargeSourceKey = (typeof VENDOR_CHARGE_SOURCES)[number];
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number];

export const vendorChargeStatusFromOrdinal = (n: number): VendorChargeStatusKey =>
  VENDOR_CHARGE_STATUSES[n];
export const vendorChargeSourceFromOrdinal = (n: number): VendorChargeSourceKey =>
  VENDOR_CHARGE_SOURCES[n];
export const paymentMethodToOrdinal = (k: PaymentMethodKey) => PAYMENT_METHODS.indexOf(k);

export const VENDOR_CHARGE_STATUS_LABELS: Record<VendorChargeStatusKey, string> = {
  Unpaid: "Ödənilməyib",
  PartiallyPaid: "Qismən ödənilib",
  Paid: "Ödənilib",
  Cancelled: "Ləğv edilib",
};

export const VENDOR_CHARGE_SOURCE_LABELS: Record<VendorChargeSourceKey, string> = {
  ServiceSchedule: "Müqavilə cədvəli",
  GoodsDelivery: "Mal tədarükü",
  Manual: "Əl ilə",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  Cash: "Nağd",
  BankTransfer: "Bank köçürməsi",
  Card: "Kart",
};

export const PAYMENT_METHODS_ORDERED: PaymentMethodKey[] = [...PAYMENT_METHODS];

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

export type VendorChargeResponse = {
  id: string;
  contractId: string;
  vendorId: string;
  contractServiceId: string | null;
  contractGoodsItemId: string | null;
  period: string | null;
  description: string;
  reference: string | null;
  unitPrice: number;
  quantity: number;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: number;
  source: number;
  chargeDate: string;
  dueDate: string | null;
  currency: string;
  cancellationReason: string | null;
  isOverdue: boolean;
  createdAt: string;
};

export type SearchVendorChargesResult = {
  items: VendorChargeResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchVendorCharges(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchVendorChargesResult>>("api/payments/vendorcharges/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export type RecordGoodsDeliveryRequest = {
  contractId: string;
  goodsItemId: string;
  quantity: number;
  reference?: string | null;
  deliveredOn?: string | null;
};

export function recordGoodsDelivery(accessToken: string, request: RecordGoodsDeliveryRequest) {
  return apiFetch<Envelope<string>>("api/payments/vendorcharges/goods-delivery", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      deliveredOn: request.deliveredOn ? dateOnlyToUtcIso(request.deliveredOn) : null,
    }),
  }).then((e) => e.data);
}

export function cancelVendorCharge(
  accessToken: string,
  chargeId: string,
  reason?: string | null,
) {
  return apiFetch<MessageOnly>(`api/payments/vendorcharges/${chargeId}/cancel`, accessToken, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

export type CreateVendorPaymentRequest = {
  vendorChargeId: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
};

export function createVendorPayment(accessToken: string, request: CreateVendorPaymentRequest) {
  return apiFetch<Envelope<string>>("api/payments/vendorpayments", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      paymentMethod: paymentMethodToOrdinal(request.paymentMethod),
      paymentDate: dateOnlyToUtcIso(request.paymentDate),
    }),
  }).then((e) => e.data);
}
