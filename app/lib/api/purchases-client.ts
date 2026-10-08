import { apiFetch } from "./client";
import { dateOnlyToUtcIso, searchBody, type SearchParams } from "./payments";

type Envelope<T> = { data: T; message: string };

export type PurchaseLineInput = {
  nomenclatureId: string;
  quantity: number;
  unitPrice: number;
};

export type CreatePurchaseRequest = {
  vendorId: string;
  purchaseDate: string;
  note?: string | null;
  lines: PurchaseLineInput[];
};

export type PurchaseResponse = {
  id: string;
  vendorId: string;
  vendorName: string | null;
  purchaseDate: string;
  invoiceNumber: string | null;
  note: string | null;
  receivedOnUtc: string | null;
  status: number;
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string | null;
  lines?: PurchaseLineResponse[];
};

export type PurchaseLineResponse = {
  id: string;
  nomenclatureId: string;
  nomenclatureCode: string | null;
  nomenclatureName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SearchPurchasesResult = {
  purchases: PurchaseResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type NomenclaturePurchaseHistoryItem = {
  purchaseId: string;
  purchaseDate: string;
  invoiceNumber: string | null;
  vendorName: string | null;
  vendorId: string;
  status: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function purchaseStatusLabel(status: number) {
  switch (status) {
    case 0:
      return "Hazırlanır";
    case 1:
      return "Qəbul edilib";
    case 2:
      return "Ləğv edilib";
    default:
      return "Naməlum";
  }
}

export function searchPurchases(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchPurchasesResult>>("api/payments/purchases/search", accessToken, {
    method: "POST",
    body: searchBody(params),
  }).then((envelope) => envelope.data);
}

export function createPurchase(accessToken: string, request: CreatePurchaseRequest) {
  return apiFetch<Envelope<string>>("api/payments/purchases", accessToken, {
    method: "POST",
    body: JSON.stringify({ ...request, purchaseDate: dateOnlyToUtcIso(request.purchaseDate) }),
  }).then((envelope) => envelope.data);
}

export function updatePurchase(
  accessToken: string,
  purchaseId: string,
  request: CreatePurchaseRequest,
) {
  return apiFetch<{ message: string }>(`api/payments/purchases/${purchaseId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({
      purchaseId,
      ...request,
      purchaseDate: dateOnlyToUtcIso(request.purchaseDate),
    }),
  });
}

export function getPurchase(accessToken: string, purchaseId: string) {
  return apiFetch<Envelope<PurchaseResponse>>(
    `api/payments/purchases/${purchaseId}`,
    accessToken,
  ).then((envelope) => envelope.data);
}

export function getNomenclaturePurchaseHistory(accessToken: string, nomenclatureId: string) {
  return apiFetch<Envelope<NomenclaturePurchaseHistoryItem[]>>(
    `api/payments/purchases/nomenclature/${nomenclatureId}/history`,
    accessToken,
  ).then((envelope) => envelope.data);
}

export function receivePurchase(accessToken: string, purchaseId: string) {
  return apiFetch<{ message: string }>(
    `api/payments/purchases/${purchaseId}/receive`,
    accessToken,
    { method: "POST" },
  );
}

export function cancelPurchase(accessToken: string, purchaseId: string, note?: string) {
  return apiFetch<{ message: string }>(
    `api/payments/purchases/${purchaseId}/cancel`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ purchaseId, note: note || null }),
    },
  );
}
