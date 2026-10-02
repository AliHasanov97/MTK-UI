import { apiFetch } from "./client";
import { searchBody, type SearchParams } from "./payments";

// The Payments API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal. These arrays are ordered to match the C# enums
// exactly — index = ordinal.
// Backend: MTK.Modules.Payments.Domain.Charges.ChargeStatus
const VENDOR_CHARGE_STATUSES = ["Unpaid", "PartiallyPaid", "Paid", "Cancelled"] as const;
const PAYMENT_METHODS = ["Cash", "BankTransfer", "Card"] as const;

export type VendorChargeStatusKey = (typeof VENDOR_CHARGE_STATUSES)[number];
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number];

export const vendorChargeStatusFromOrdinal = (n: number): VendorChargeStatusKey =>
  VENDOR_CHARGE_STATUSES[n];
export const paymentMethodToOrdinal = (k: PaymentMethodKey) => PAYMENT_METHODS.indexOf(k);

export const VENDOR_CHARGE_STATUS_LABELS: Record<VendorChargeStatusKey, string> = {
  Unpaid: "Ödənilməyib",
  PartiallyPaid: "Qismən ödənilib",
  Paid: "Ödənilib",
  Cancelled: "Ləğv edilib",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  Cash: "Nağd",
  BankTransfer: "Bank köçürməsi",
  Card: "Kart",
};

export const PAYMENT_METHODS_ORDERED: PaymentMethodKey[] = [...PAYMENT_METHODS];

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

// Vendor charges and resident charges are one aggregate now; the vendor view
// only exposes the vendor-specific columns.
export type VendorChargeResponse = {
  id: string;
  contractId: string | null;
  vendorId: string;
  contractServiceId: string | null;
  period: string | null;
  description: string | null;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: number;
  chargeDate: string;
  dueDate: string | null;
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

export function getChargesByVendor(accessToken: string, vendorId: string) {
  return apiFetch<Envelope<VendorChargeResponse[]>>(`api/payments/vendorcharges/vendor/${vendorId}`, accessToken).then(
    (e) => e.data,
  );
}

export function cancelVendorCharge(accessToken: string, chargeId: string) {
  return apiFetch<MessageOnly>(`api/payments/vendorcharges/${chargeId}/cancel`, accessToken, {
    method: "POST",
    // The controller binds the command with [FromBody]; an empty object keeps
    // the request valid (the charge id itself comes from the route).
    body: JSON.stringify({}),
  });
}

// A vendor payment now targets the vendor: the backend allocates it FIFO across
// the vendor's open charges (with any leftover kept as an advance), exactly like
// resident payments.
//
// No paymentDate here: the handler stamps it server-side (DateTimeOffset.UtcNow).
export type CreateVendorPaymentRequest = {
  vendorId: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  notes?: string | null;
};

export function createVendorPayment(accessToken: string, request: CreateVendorPaymentRequest) {
  return apiFetch<Envelope<string>>("api/payments/vendorpayments", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      paymentMethod: paymentMethodToOrdinal(request.paymentMethod),
    }),
  }).then((e) => e.data);
}
