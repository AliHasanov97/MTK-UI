"use client";

import { useEffect, useState } from "react";
import { QueryComparisonType, searchAuditLogs } from "../../lib/api/buildings";

/**
 * "Əməliyyatı icra etdi" — hər entity dəyişikliyi avtomatik AuditLogs-a yazılır
 * (EF SaveChanges interceptor), bu sadəcə həmin entity üçün "Created" qeydini
 * tapıb yaradan istifadəçinin adını qaytarır. Entity heç vaxt silinmədiyi üçün
 * "Created" = yeganə/ilk qeyd, əlavə sort-a ehtiyac yoxdur. Payments modulunun
 * eyni adlı hook-u (finance.tsx) ilə paralel — hər modul öz AuditLogs-unu oxuyur.
 */
export function useCreatedBy(
  accessToken: string,
  entityType: "Owner" | "Apartment" | "Garage" | "Building" | "OwnershipHistory",
  // Boş ola bilər — çağıran tərəf hələ yüklənməmiş entity-nin id-sini gözləyərkən
  // (hook-lar şərti çağırıla bilmədiyi üçün) null-check-dən ƏVVƏL çağırmalıdır.
  entityId: string,
) {
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    searchAuditLogs(accessToken, {
      filters: [
        { columnName: "EntityType", comparison: QueryComparisonType.Equals, value: entityType },
        { columnName: "EntityId", comparison: QueryComparisonType.Equals, value: entityId },
        { columnName: "Action", comparison: QueryComparisonType.Equals, value: "Created" },
      ],
      pageSize: 1,
    })
      .then((res) => setCreatedBy(res.auditLogs[0]?.user?.name ?? null))
      .catch(() => setCreatedBy(null));
  }, [accessToken, entityType, entityId]);

  return createdBy;
}

/**
 * `useCreatedBy`-ın toplu versiyası — siyahı görünüşləri üçün (Binalar siyahısı
 * kimi) hər sətir üçün ayrıca sorğu yerinə, bu entity tipinin BÜTÜN "Created"
 * qeydlərini bir dəfəyə çəkib entityId -> ad lüğəti qaytarır.
 */
export function useCreatedByMap(
  accessToken: string,
  entityType: "Owner" | "Apartment" | "Garage" | "Building" | "OwnershipHistory",
  pageSize = 200,
) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    searchAuditLogs(accessToken, {
      filters: [
        { columnName: "EntityType", comparison: QueryComparisonType.Equals, value: entityType },
        { columnName: "Action", comparison: QueryComparisonType.Equals, value: "Created" },
      ],
      pageSize,
    })
      .then((res) => {
        const next: Record<string, string> = {};
        res.auditLogs.forEach((l) => {
          if (l.user) next[l.entityId] = l.user.name;
        });
        setMap(next);
      })
      .catch(() => setMap({}));
  }, [accessToken, entityType, pageSize]);

  return map;
}
