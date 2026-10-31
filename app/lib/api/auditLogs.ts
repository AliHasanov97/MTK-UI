import { apiFetch } from "./client";
import { QueryComparisonType, SortDirection, type QueryFilter } from "./buildings";

/**
 * Hər modulun öz AuditLogs cədvəli və öz endpoint-i var (Identity, Buildings, Payments).
 * Buradakı funksiya hamısını eyni "sətir" formasına gətirir ki, bir səhifə hamısını göstərə bilsin.
 */
export const AUDIT_MODULES = [
  { key: "identity", label: "İdentifikasiya", path: "api/identity/auditlogs/search" },
  { key: "buildings", label: "Binalar", path: "api/buildings/auditlogs/search" },
  { key: "payments", label: "Maliyyə və ödənişlər", path: "api/payments/auditlogs/search" },
  { key: "hr", label: "HR", path: "api/hr/auditlogs/search" },
  { key: "warehouse", label: "İnventar (anbar)", path: "api/warehouse/auditlogs/search" },
] as const;

/** Backend-in yazdığı əməliyyat adları (DbContext.SaveChanges) və göstəriləcək etiketlər. */
export const AUDIT_ACTIONS = [
  { value: "Created", label: "Yaradıldı" },
  { value: "Updated", label: "Dəyişdirildi" },
  { value: "Deleted", label: "Silindi" },
] as const;

export function auditActionLabel(action: string) {
  return AUDIT_ACTIONS.find((a) => a.value === action)?.label ?? action;
}

/**
 * Backend EntityType texniki C# sinif adıdır (Charge, Contract…).
 * İstifadəçiyə insan dilində göstərmək üçün lüğət; bilinməyən adlar olduğu kimi qalır.
 */
const ENTITY_LABELS: Record<string, string> = {
  Charge: "Ödəniş tələbi",
  Payment: "Ödəniş",
  Contract: "Müqavilə",
  Rate: "Tarif",
  OwnerBalance: "Sahib balansı",
  Owner: "Sahib",
  Apartment: "Mənzil",
  Garage: "Qaraj",
  Building: "Bina",
  Section: "Bölmə",
  Floor: "Mərtəbə",
  Employee: "İşçi",
  User: "İstifadəçi",
  Role: "Rol",
  Invoice: "Hesab",
  Nomenclature: "İnventar",
  Purchase: "Alış",
  PaymentSource: "Ödəniş mənbəyi",
};

export function auditEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] ?? entityType;
}

/** "Nə dəyişib?" filtri üçün bilinən obyekt növləri (backend-ə texniki ad göndərilir). */
export const AUDIT_ENTITY_TYPES = Object.keys(ENTITY_LABELS).map((value) => ({
  value,
  label: ENTITY_LABELS[value],
}));

export type AuditModuleKey = (typeof AUDIT_MODULES)[number]["key"];

export type AuditRow = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: string | null;
  newValues: string | null;
  /** Göstəriləcək istifadəçi: ad (Buildings/Payments) və ya qısaldılmış ID (Identity). */
  userLabel: string | null;
  timestamp: string;
};

export type AuditSearch = {
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export type AuditSearchResult = {
  rows: AuditRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

type RawLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: string | null;
  newValues?: string | null;
  userId?: string | null; // Identity
  user?: { id: string; name: string } | null; // Buildings, Payments
  timestamp: string;
};

type RawResult = { auditLogs: RawLog[]; totalCount: number; page: number; pageSize: number };

function buildFilters(s: AuditSearch): QueryFilter[] | null {
  const filters: QueryFilter[] = [];
  // Backend-in Contains müqayisəsi böyük/kiçik hərfə həssasdır, entity adları isə C# sinif adlarıdır
  // (User, Employee…), ona görə yazılan mətnin ilk hərfi böyüdülür: "employ" → "Employ".
  const entity = s.entityType?.trim();
  if (entity) {
    filters.push({
      columnName: "EntityType",
      comparison: QueryComparisonType.Contains,
      value: entity.charAt(0).toUpperCase() + entity.slice(1),
    });
  }
  if (s.action) filters.push({ columnName: "Action", comparison: QueryComparisonType.Equals, value: s.action });
  if (s.dateFrom) filters.push({ columnName: "Timestamp", comparison: QueryComparisonType.GreaterThanOrEqual, value: s.dateFrom });
  if (s.dateTo) filters.push({ columnName: "Timestamp", comparison: QueryComparisonType.LessThanOrEqual, value: s.dateTo });
  return filters.length ? filters : null;
}

function toRow(log: RawLog): AuditRow {
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    oldValues: log.oldValues ?? null,
    newValues: log.newValues ?? null,
    userLabel: log.user?.name ?? (log.userId ? `${log.userId.slice(0, 8)}…` : null),
    timestamp: log.timestamp,
  };
}

export function searchModuleAuditLogs(
  accessToken: string,
  module: AuditModuleKey,
  search: AuditSearch,
): Promise<AuditSearchResult> {
  const { path } = AUDIT_MODULES.find((m) => m.key === module)!;
  return apiFetch<{ data: RawResult }>(path, accessToken, {
    method: "POST",
    body: JSON.stringify({
      filters: buildFilters(search),
      sortCriteria: { columnName: "Timestamp", direction: SortDirection.Descending },
      searchTerm: null,
      page: search.page,
      pageSize: search.pageSize,
    }),
  }).then(({ data }) => ({
    rows: data.auditLogs.map(toRow),
    totalCount: data.totalCount,
    page: data.page,
    pageSize: data.pageSize,
  }));
}
