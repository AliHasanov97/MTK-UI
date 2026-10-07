import { apiFetch } from "./client";
import { searchBody, type SearchParams } from "./payments";

// The Warehouse API has no [JsonStringEnumConverter], so every enum crosses the
// wire as its numeric ordinal. Unlike the Payments enums these do NOT start at 0
// (and NomenclatureCategory has a gap: Other = 99), so the value is mapped
// explicitly — never by array index.
export const NOMENCLATURE_CATEGORIES = {
  Material: 1,
  Equipment: 2,
  Service: 3,
  Supply: 4,
  Other: 99,
} as const;

export type NomenclatureCategoryKey = keyof typeof NOMENCLATURE_CATEGORIES;

export const NOMENCLATURE_CATEGORY_LABELS: Record<NomenclatureCategoryKey, string> = {
  Material: "Material",
  Equipment: "Avadanlıq",
  Service: "Xidmət",
  Supply: "Təchizat",
  Other: "Digər",
};

export const NOMENCLATURE_CATEGORY_ORDER: NomenclatureCategoryKey[] = [
  "Material",
  "Equipment",
  "Service",
  "Supply",
  "Other",
];

export function categoryFromOrdinal(ordinal: number): NomenclatureCategoryKey {
  const key = (Object.keys(NOMENCLATURE_CATEGORIES) as NomenclatureCategoryKey[]).find(
    (k) => NOMENCLATURE_CATEGORIES[k] === ordinal,
  );
  return key ?? "Other";
}

export const UNITS = {
  Piece: 1,
  Meter: 2,
  Kilogram: 3,
  Liter: 4,
  Set: 5,
  SquareMeter: 6,
  CubicMeter: 7,
  Box: 8,
  Package: 9,
  Sack: 10,
} as const;

export type UnitKey = keyof typeof UNITS;

export const UNIT_LABELS: Record<UnitKey, string> = {
  Piece: "Ədəd",
  Meter: "Metr",
  Kilogram: "Kiloqram",
  Liter: "Litr",
  Set: "Komplekt",
  SquareMeter: "kv. metr",
  CubicMeter: "kub metr",
  Box: "Qutu",
  Package: "Paket",
  Sack: "Çuval",
};

export const UNIT_ORDER: UnitKey[] = [
  "Piece",
  "Meter",
  "Kilogram",
  "Liter",
  "Set",
  "SquareMeter",
  "CubicMeter",
  "Box",
  "Package",
  "Sack",
];

export function unitFromOrdinal(ordinal: number): UnitKey {
  const key = (Object.keys(UNITS) as UnitKey[]).find((k) => UNITS[k] === ordinal);
  return key ?? "Piece";
}

export const TRANSACTION_TYPES = {
  Receipt: 1,
  Issue: 2,
} as const;

export type TransactionTypeKey = keyof typeof TRANSACTION_TYPES;

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeKey, string> = {
  Receipt: "Daxilolma",
  Issue: "Çıxarış",
};

export function transactionTypeFromOrdinal(ordinal: number): TransactionTypeKey {
  return ordinal === TRANSACTION_TYPES.Issue ? "Issue" : "Receipt";
}

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

/* ------------------------------------------------------------------ */
/* Materiallar (nomenklaturalar)                                       */
/* ------------------------------------------------------------------ */

export type NomenclatureDto = {
  id: string;
  code: string;
  name: string;
  category: number;
  unit: number;
  isActive: boolean;
};

export type NomenclatureListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: number;
  unit: number;
  isActive: boolean;
};

export type NomenclatureResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: number;
  unit: number;
  minStockLevel: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type SearchNomenclaturesResult = {
  nomenclatures: NomenclatureListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function getAllNomenclatures(
  accessToken: string,
  params: { pageNumber?: number; pageSize?: number; isActive?: boolean | null } = {},
) {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.isActive !== undefined && params.isActive !== null) {
    query.set("isActive", String(params.isActive));
  }
  return apiFetch<Envelope<NomenclatureDto[]>>(
    `api/warehouse/nomenclatures?${query.toString()}`,
    accessToken,
  ).then((e) => e.data);
}

export function getNomenclature(accessToken: string, id: string) {
  return apiFetch<Envelope<NomenclatureResponse>>(
    `api/warehouse/nomenclatures/${id}`,
    accessToken,
  ).then((e) => e.data);
}

export function searchNomenclatures(accessToken: string, params: SearchParams = {}) {
  return apiFetch<Envelope<SearchNomenclaturesResult>>(
    "api/warehouse/nomenclatures/search",
    accessToken,
    { method: "POST", body: searchBody(params) },
  ).then((e) => e.data);
}

export type SaveNomenclatureRequest = {
  code: string;
  name: string;
  description?: string | null;
  category: NomenclatureCategoryKey;
  unit: UnitKey;
  minStockLevel?: number | null;
  isActive: boolean;
};

export type UpdateNomenclatureRequest = {
  name: string;
  description?: string | null;
  category: NomenclatureCategoryKey;
  unit: UnitKey;
  minStockLevel?: number | null;
};

export function createNomenclature(accessToken: string, request: SaveNomenclatureRequest) {
  return apiFetch<Envelope<string>>("api/warehouse/nomenclatures", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      category: NOMENCLATURE_CATEGORIES[request.category],
      unit: UNITS[request.unit],
    }),
  }).then((e) => e.data);
}

export function updateNomenclature(
  accessToken: string,
  id: string,
  request: UpdateNomenclatureRequest,
) {
  return apiFetch<MessageOnly>(`api/warehouse/nomenclatures/${id}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({
      id,
      ...request,
      category: NOMENCLATURE_CATEGORIES[request.category],
      unit: UNITS[request.unit],
    }),
  });
}

export function deleteNomenclature(accessToken: string, id: string) {
  return apiFetch<MessageOnly>(`api/warehouse/nomenclatures/${id}`, accessToken, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------------ */
/* Anbar qalıqları                                                     */
/* ------------------------------------------------------------------ */

export type StockDto = {
  nomenclatureId: string;
  nomenclatureCode: string;
  nomenclatureName: string;
  quantityOnHand: number;
  lastTransactionDate: string | null;
};

export type LowStockDto = {
  nomenclatureId: string;
  nomenclatureCode: string;
  nomenclatureName: string;
  quantityOnHand: number;
  minStockLevel: number;
  deficit: number;
};

export type StockResponse = {
  nomenclatureId: string;
  nomenclatureCode: string;
  nomenclatureName: string;
  quantityOnHand: number;
  lastTransactionDate: string | null;
  minStockLevel: number | null;
  isLowStock: boolean;
};

export function getAllStock(accessToken: string, pageNumber = 1, pageSize = 200) {
  const query = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  });
  return apiFetch<Envelope<StockDto[]>>(
    `api/warehouse/stocks?${query.toString()}`,
    accessToken,
  ).then((e) => e.data);
}

export function getLowStockItems(accessToken: string) {
  return apiFetch<Envelope<LowStockDto[]>>("api/warehouse/stocks/low-stock", accessToken).then(
    (e) => e.data,
  );
}

export function getStockByNomenclature(accessToken: string, nomenclatureId: string) {
  return apiFetch<Envelope<StockResponse>>(
    `api/warehouse/stocks/nomenclature/${nomenclatureId}`,
    accessToken,
  ).then((e) => e.data);
}

/* ------------------------------------------------------------------ */
/* Əməliyyatlar (daxilolma / çıxarış)                                  */
/* ------------------------------------------------------------------ */

export type TransactionDto = {
  id: string;
  transactionType: number;
  nomenclatureId: string;
  nomenclatureName: string;
  quantity: number;
  unitPrice: number | null;
  transactionDate: string;
  notes: string | null;
};

export type TransactionResponse = {
  id: string;
  transactionType: number;
  nomenclatureId: string;
  nomenclatureName: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  transactionDate: string;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
};

export type TransactionHistoryParams = {
  nomenclatureId?: string | null;
  transactionType?: TransactionTypeKey | null;
  startDate?: string | null;
  endDate?: string | null;
  pageNumber?: number;
  pageSize?: number;
};

export function searchTransactions(accessToken: string, params: TransactionHistoryParams = {}) {
  return apiFetch<Envelope<TransactionDto[]>>(
    "api/warehouse/transactions/search",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        nomenclatureId: params.nomenclatureId ?? null,
        transactionType:
          params.transactionType != null ? TRANSACTION_TYPES[params.transactionType] : null,
        startDate: params.startDate ?? null,
        endDate: params.endDate ?? null,
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 100,
      }),
    },
  ).then((e) => e.data);
}

export function getTransaction(accessToken: string, id: string) {
  return apiFetch<Envelope<TransactionResponse>>(
    `api/warehouse/transactions/${id}`,
    accessToken,
  ).then((e) => e.data);
}

export type RecordReceiptRequest = {
  nomenclatureId: string;
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
};

export function recordReceipt(accessToken: string, request: RecordReceiptRequest) {
  return apiFetch<Envelope<string>>("api/warehouse/transactions/receipt", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      transactionDate: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: null,
    }),
  }).then((e) => e.data);
}

export type RecordIssueRequest = {
  nomenclatureId: string;
  quantity: number;
  notes?: string | null;
};

export function recordIssue(accessToken: string, request: RecordIssueRequest) {
  return apiFetch<Envelope<string>>("api/warehouse/transactions/issue", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      transactionDate: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: null,
    }),
  }).then((e) => e.data);
}
