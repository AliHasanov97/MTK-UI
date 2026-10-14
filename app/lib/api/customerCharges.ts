import { apiFetch } from "./client";
import { searchBody, type PaymentResponse, type SearchParams } from "./payments";
import { paymentMethodToOrdinal, type PaymentMethodKey, type VendorChargeResponse } from "./vendorCharges";

// Customer charges share the charge status/payment method enums with vendor
// charges (same Charge aggregate), so those label maps and ordinal helpers are
// imported from vendorCharges.ts rather than duplicated.

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

export type CustomerChargeResponse = {
  id: string;
  contractId: string | null;
  customerId: string;
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

/** Lets views that already render vendor charge rows reuse that markup for a customer's charges. */
export function customerChargeAsRow(c: CustomerChargeResponse): VendorChargeResponse {
  const { customerId, ...rest } = c;
  return { ...rest, vendorId: customerId };
}

export type SearchCustomerChargesResult = {
  items: CustomerChargeResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function searchCustomerCharges(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchCustomerChargesResult>>("api/payments/customercharges/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((e) => e.data);
}

export function getChargesByCustomer(accessToken: string, customerId: string) {
  return apiFetch<Envelope<CustomerChargeResponse[]>>(
    `api/payments/customercharges/customer/${customerId}`,
    accessToken,
  ).then((e) => e.data);
}

export function getPaymentsByCustomer(accessToken: string, customerId: string) {
  return apiFetch<Envelope<PaymentResponse[]>>(`api/payments/customerpayments/customer/${customerId}`, accessToken).then(
    (e) => e.data,
  );
}

export type CreateCustomerChargeRequest = {
  customerId: string;
  description: string;
  amount: number;
  /** ISO date-time; the form sends a UTC-midnight date. */
  dueDate?: string | null;
};

export function createCustomerCharge(accessToken: string, request: CreateCustomerChargeRequest) {
  return apiFetch<Envelope<string>>("api/payments/customercharges", accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  }).then((e) => e.data);
}

export function cancelCustomerCharge(accessToken: string, chargeId: string) {
  return apiFetch<MessageOnly>(`api/payments/customercharges/${chargeId}/cancel`, accessToken, {
    method: "POST",
  });
}

// A customer payment targets the customer: the backend allocates it FIFO across
// the customer's open charges, with any leftover kept as an advance that the
// next charge settles automatically. No paymentDate: the handler stamps it.
export type CreateCustomerPaymentRequest = {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  notes?: string | null;
};

export function createCustomerPayment(accessToken: string, request: CreateCustomerPaymentRequest) {
  return apiFetch<Envelope<string>>("api/payments/customerpayments", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      paymentMethod: paymentMethodToOrdinal(request.paymentMethod),
    }),
  }).then((e) => e.data);
}
