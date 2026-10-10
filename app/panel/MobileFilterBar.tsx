"use client";

/**
 * Telefonda cədvəl başlığı (və ondakı sütun filtrləri) gizlədilir, cədvəl kartlara çevrilir.
 * Bu zolaq eyni filtrləri cədvəlin üstündə "çip" şəklində göstərir (geniş ekranda gizlidir).
 *
 *   <MobileFilterBar activeCount={n} onClear={clear}>
 *     <FilterChip label="Status"><ColumnFilter … /></FilterChip>
 *   </MobileFilterBar>
 */
export function MobileFilterBar({
  children,
  activeCount = 0,
  onClear,
}: {
  children: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
}) {
  return (
    <div className="tf-mobile" aria-label="Filtrlər">
      {children}
      {onClear && activeCount > 0 && (
        <button type="button" className="tf-chip tf-chip-clear" onClick={onClear}>
          Təmizlə ({activeCount})
        </button>
      )}
    </div>
  );
}

export function FilterChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="tf-chip">
      {label}
      {children}
    </span>
  );
}
