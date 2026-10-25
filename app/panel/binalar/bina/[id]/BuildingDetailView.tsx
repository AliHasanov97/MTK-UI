"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../../lib/auth/roles";
import { ApiError } from "../../../../lib/api/client";
import {
  QueryComparisonType,
  SortDirection,
  getBuilding,
  listApartmentsByBuilding,
  searchApartments,
  type Apartment,
  type Building,
  type QueryFilter,
} from "../../../../lib/api/buildings";
import { ColumnFilter, SortIcon } from "../../../ColumnFilter";
import { FilterChip, MobileFilterBar } from "../../../MobileFilterBar";
import { ApartmentTypesModal, CreateApartmentModal } from "../../bina-siyahisi/BinaSiyahisiView";
import { BuildingSchemeModal, fetchDebtByApartment } from "./BuildingScheme";

const PAGE_SIZE = 10;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (amount: number) => `${money.format(amount)} ₼`;

function Pagination({
  pageNumber,
  pageCount,
  onChange,
}: {
  pageNumber: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="panel-pagination">
      <span>
        Səhifə {pageNumber}/{pageCount}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="panel-btn panel-btn-sm"
          disabled={pageNumber <= 1}
          onClick={() => onChange(Math.max(1, pageNumber - 1))}
        >
          Əvvəlki
        </button>
        <button
          type="button"
          className="panel-btn panel-btn-sm"
          disabled={pageNumber >= pageCount}
          onClick={() => onChange(pageNumber + 1)}
        >
          Növbəti
        </button>
      </div>
    </div>
  );
}

export function BuildingDetailView({ buildingId }: { buildingId: string }) {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [building, setBuilding] = useState<Building | null>(null);
  const [allApartments, setAllApartments] = useState<Apartment[] | null>(null);
  const [debtByApartment, setDebtByApartment] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showScheme, setShowScheme] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [showCreateApartment, setShowCreateApartment] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([getBuilding(auth.accessToken, buildingId), listApartmentsByBuilding(auth.accessToken, buildingId)])
      .then(([b, apartments]) => {
        setBuilding(b);
        setAllApartments(apartments);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, buildingId, reloadKey]);

  const apartmentIds = allApartments?.map((a) => a.id) ?? null;
  const apartmentIdsKey = apartmentIds ? apartmentIds.join(",") : null;

  useEffect(() => {
    if (auth.status !== "authenticated" || apartmentIdsKey === null) return;
    fetchDebtByApartment(auth.accessToken, apartmentIdsKey === "" ? [] : apartmentIdsKey.split(","))
      .then(setDebtByApartment)
      .catch(() => setDebtByApartment(new Map()));
  }, [auth, apartmentIdsKey]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!building || !allApartments) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  const ownedCount = allApartments.filter((a) => a.currentOwner).length;
  const totalArea = allApartments.reduce((sum, a) => sum + a.areaSquareMeters, 0);
  const debts = [...(debtByApartment?.values() ?? [])];
  const totalDebt = debts.reduce((sum, d) => sum + d, 0);
  const debtorCount = debts.filter((d) => d > 0.005).length;

  return (
    <div className="owner-dashboard">
      <Link className="owner-back-link" href="/panel/binalar/bina-siyahisi">
        ← Binalara qayıt
      </Link>

      <div className="owner-hero">
        <div className="owner-hero-top">
          <div className="owner-avatar">▦</div>
          <div className="owner-hero-body">
            <h2>{building.name}</h2>
            <div className="owner-hero-meta">
              <span>{building.fullAddress}</span>
              {building.description && <span>{building.description}</span>}
            </div>
          </div>
          <div className="bina-actions">
            <span className="panel-role-tag">{building.status}</span>
            <button type="button" className="panel-btn panel-btn-sm" onClick={() => setShowScheme(true)}>
              Sxem
            </button>
            {canManage && (
              <>
                <button type="button" className="panel-btn panel-btn-sm" onClick={() => setShowTypes(true)}>
                  Mənzil tipləri
                </button>
                <button
                  type="button"
                  className="panel-btn panel-btn-sm panel-btn-primary"
                  onClick={() => setShowCreateApartment(true)}
                >
                  + Mənzil
                </button>
              </>
            )}
          </div>
        </div>
        <div className="owner-hero-stats">
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Mənzil</span>
            <strong>{allApartments.length}</strong>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Sahibli / boş</span>
            <strong>
              {ownedCount} / {allApartments.length - ownedCount}
            </strong>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Ümumi sahə</span>
            <strong>{money.format(totalArea)} m²</strong>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Açıq borc</span>
            <strong className={totalDebt > 0.005 ? "vendor-value-danger" : ""}>
              {debtByApartment ? formatMoney(totalDebt) : "…"}
            </strong>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Borclu mənzil</span>
            <strong>{debtByApartment ? debtorCount : "…"}</strong>
          </div>
        </div>
      </div>

      <ApartmentsSection
        accessToken={auth.accessToken}
        buildingId={buildingId}
        allApartments={allApartments}
        debtByApartment={debtByApartment}
        reloadKey={reloadKey}
      />

      {showScheme && (
        <BuildingSchemeModal
          building={building}
          apartments={allApartments}
          debtByApartment={debtByApartment}
          onClose={() => setShowScheme(false)}
        />
      )}

      {showTypes && <ApartmentTypesModal building={building} onClose={() => setShowTypes(false)} />}

      {showCreateApartment && (
        <CreateApartmentModal
          building={building}
          onClose={() => setShowCreateApartment(false)}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

// FullName isn't a mapped column on Owner, so "Sahib" is filterable but not
// sortable (EF can't translate the ORDER BY) — same as the Mənzillər page.
type SortColumn = "apartmentNumber" | "floor" | "roomCount" | "areaSquareMeters" | "status";
type SortState = { column: SortColumn; direction: "asc" | "desc" };

const SORT_COLUMN_MAP: Record<SortColumn, string> = {
  apartmentNumber: "ApartmentNumber",
  floor: "Floor",
  roomCount: "RoomCount",
  areaSquareMeters: "AreaSquareMeters",
  status: "Status",
};

const NO_OWNER = "__NONE__";
type DebtFilter = "debtor" | "clear";

function ApartmentsSection({
  accessToken,
  buildingId,
  allApartments,
  debtByApartment,
  reloadKey,
}: {
  accessToken: string;
  buildingId: string;
  /** Every apartment of the building — only used to build the filter option lists. */
  allApartments: Apartment[];
  debtByApartment: Map<string, number> | null;
  reloadKey: number;
}) {
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [numberFilter, setNumberFilter] = useState<string[]>([]);
  const [floorFilter, setFloorFilter] = useState<number[]>([]);
  const [roomFilter, setRoomFilter] = useState<number[]>([]);
  const [areaFilter, setAreaFilter] = useState<number[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [debtFilter, setDebtFilter] = useState<DebtFilter[]>([]);
  // Floor order reads naturally for a single building; ApartmentNumber is a
  // string column, so sorting by it puts "11" after "106".
  const [sort, setSort] = useState<SortState>({ column: "floor", direction: "asc" });
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const debtorIds = debtByApartment
    ? [...debtByApartment.entries()].filter(([, debt]) => debt > 0.005).map(([id]) => id)
    : [];
  const debtorKey = debtorIds.join(",");

  // Any filter/search/sort change restarts pagination from the first page.
  const filterSignature = JSON.stringify([
    searchTerm,
    numberFilter,
    floorFilter,
    roomFilter,
    areaFilter,
    ownerFilter,
    statusFilter,
    debtFilter,
    sort,
  ]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    const filters: QueryFilter[] = [
      { columnName: "BuildingId", comparison: QueryComparisonType.Equals, value: buildingId },
    ];
    if (numberFilter.length > 0) {
      filters.push({ columnName: "ApartmentNumber", comparison: QueryComparisonType.In, value: numberFilter });
    }
    if (floorFilter.length > 0) {
      filters.push({ columnName: "Floor", comparison: QueryComparisonType.In, value: floorFilter });
    }
    if (roomFilter.length > 0) {
      filters.push({ columnName: "RoomCount", comparison: QueryComparisonType.In, value: roomFilter });
    }
    if (areaFilter.length > 0) {
      filters.push({ columnName: "AreaSquareMeters", comparison: QueryComparisonType.In, value: areaFilter });
    }
    if (statusFilter.length > 0) {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.In, value: statusFilter });
    }
    // "Sahibsiz" together with specific owners would need an OR the backend's
    // filter engine doesn't support, so that mixed selection sends no owner filter.
    const realOwners = ownerFilter.filter((v) => v !== NO_OWNER);
    const noOwnerSelected = ownerFilter.includes(NO_OWNER);
    if (realOwners.length > 0 && !noOwnerSelected) {
      filters.push({ columnName: "CurrentOwnerId", comparison: QueryComparisonType.In, value: realOwners });
    } else if (noOwnerSelected && realOwners.length === 0) {
      filters.push({ columnName: "CurrentOwnerId", comparison: QueryComparisonType.IsNull });
    }
    // Debt lives in Payments, so it is filtered by the ids of the apartments that owe.
    // Both options selected means "everything" — no filter.
    const debtors = debtorKey === "" ? [] : debtorKey.split(",");
    if (debtFilter.length === 1 && debtFilter[0] === "debtor") {
      filters.push(
        debtors.length > 0
          ? { columnName: "Id", comparison: QueryComparisonType.In, value: debtors }
          : { columnName: "Id", comparison: QueryComparisonType.IsNull },
      );
    } else if (debtFilter.length === 1 && debtFilter[0] === "clear" && debtors.length > 0) {
      filters.push({ columnName: "Id", comparison: QueryComparisonType.NotIn, value: debtors });
    }

    searchApartments(accessToken, {
      filters,
      sortCriteria: {
        columnName: SORT_COLUMN_MAP[sort.column],
        direction: sort.direction === "asc" ? SortDirection.Ascending : SortDirection.Descending,
      },
      searchTerm: searchTerm || undefined,
      // Buildings modulunda səhifə 0-dan sayılır (Skip(page * pageSize)).
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setApartments(res.items);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [
    accessToken,
    buildingId,
    searchTerm,
    numberFilter,
    floorFilter,
    roomFilter,
    areaFilter,
    ownerFilter,
    statusFilter,
    debtFilter,
    debtorKey,
    sort,
    pageNumber,
    reloadKey,
  ]);

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  const numeric = (x: string, y: string) => x.localeCompare(y, undefined, { numeric: true });
  const numberOptions = [...new Set(allApartments.map((a) => a.apartmentNumber))]
    .sort(numeric)
    .map((n) => ({ value: n, label: n }));
  const floorOptions = [...new Set(allApartments.map((a) => a.floor))]
    .sort((x, y) => x - y)
    .map((floor) => ({ value: floor, label: `${floor}-cü mərtəbə` }));
  const roomOptions = [...new Set(allApartments.map((a) => a.roomCount))]
    .sort((x, y) => x - y)
    .map((rooms) => ({ value: rooms, label: `${rooms} otaqlı` }));
  const areaOptions = [...new Set(allApartments.map((a) => a.areaSquareMeters))]
    .sort((x, y) => x - y)
    .map((area) => ({ value: area, label: `${area} m²` }));
  const statusOptions = [...new Set(allApartments.map((a) => a.status))]
    .sort()
    .map((status) => ({ value: status, label: status }));
  const ownerOptions = [
    ...[...new Map(allApartments.filter((a) => a.currentOwner).map((a) => [a.currentOwner!.id, a.currentOwner!.name])).entries()]
      .sort((a, b) => numeric(a[1], b[1]))
      .map(([id, name]) => ({ value: id, label: name })),
    { value: NO_OWNER, label: "Sahibsiz" },
  ];
  const debtOptions: { value: DebtFilter; label: string }[] = [
    { value: "debtor", label: "Borclu" },
    { value: "clear", label: "Borcsuz" },
  ];

  const activeFilterCount = [
    numberFilter,
    floorFilter,
    roomFilter,
    areaFilter,
    ownerFilter,
    statusFilter,
    debtFilter,
  ].filter((f) => f.length > 0).length;

  function clearFilters() {
    setNumberFilter([]);
    setFloorFilter([]);
    setRoomFilter([]);
    setAreaFilter([]);
    setOwnerFilter([]);
    setStatusFilter([]);
    setDebtFilter([]);
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const sortableHeader = (column: SortColumn, label: string) => (
    <span className="th-label" onClick={() => handleSort(column)}>
      {label} <SortIcon active={sort.column === column} direction={sort.direction} />
    </span>
  );

  return (
    <section className="panel-card owner-section-card">
      <h4>
        <span className="panel-card-icon owner-section-icon">⌂</span>
        Mənzillər
        <span className="vendor-count" style={{ marginLeft: "auto" }}>
          {totalCount} mənzil
        </span>
      </h4>

      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (mənzil nömrəsi, sahib…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {activeFilterCount > 0 && (
          <button type="button" className="panel-btn panel-btn-sm" onClick={clearFilters}>
            Filtrləri təmizlə ({activeFilterCount})
          </button>
        )}
      </div>

      <MobileFilterBar activeCount={activeFilterCount} onClear={clearFilters}>
        <FilterChip label="Nömrə">
          <ColumnFilter options={numberOptions} selected={numberFilter} onChange={setNumberFilter} />
        </FilterChip>
        <FilterChip label="Mərtəbə">
          <ColumnFilter options={floorOptions} selected={floorFilter} onChange={setFloorFilter} />
        </FilterChip>
        <FilterChip label="Otaq">
          <ColumnFilter options={roomOptions} selected={roomFilter} onChange={setRoomFilter} />
        </FilterChip>
        <FilterChip label="Sahə">
          <ColumnFilter options={areaOptions} selected={areaFilter} onChange={setAreaFilter} />
        </FilterChip>
        <FilterChip label="Sahib">
          <ColumnFilter options={ownerOptions} selected={ownerFilter} onChange={setOwnerFilter} />
        </FilterChip>
        <FilterChip label="Status">
          <ColumnFilter options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
        </FilterChip>
        <FilterChip label="Borc">
          <ColumnFilter options={debtOptions} selected={debtFilter} onChange={setDebtFilter} />
        </FilterChip>
      </MobileFilterBar>

      {error && <p className="form-error">{error}</p>}

      {!apartments ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <>
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <div className="th-row">
                      {sortableHeader("apartmentNumber", "Mənzil")}
                      <ColumnFilter options={numberOptions} selected={numberFilter} onChange={setNumberFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      {sortableHeader("floor", "Mərtəbə")}
                      <ColumnFilter options={floorOptions} selected={floorFilter} onChange={setFloorFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      {sortableHeader("roomCount", "Otaq")}
                      <ColumnFilter options={roomOptions} selected={roomFilter} onChange={setRoomFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      {sortableHeader("areaSquareMeters", "Sahə (m²)")}
                      <ColumnFilter options={areaOptions} selected={areaFilter} onChange={setAreaFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      <span>Sahib</span>
                      <ColumnFilter options={ownerOptions} selected={ownerFilter} onChange={setOwnerFilter} />
                    </div>
                  </th>
                  <th>
                    <div className="th-row">
                      {sortableHeader("status", "Status")}
                      <ColumnFilter options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
                    </div>
                  </th>
                  <th className="vendor-th-amount">
                    <div className="th-row">
                      <span>Açıq borc</span>
                      {debtByApartment && (
                        <ColumnFilter options={debtOptions} selected={debtFilter} onChange={setDebtFilter} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {apartments.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      {searchTerm || activeFilterCount > 0 ? "Nəticə tapılmadı." : "Bu binada hələ mənzil yoxdur."}
                    </td>
                  </tr>
                )}
                {apartments.map((a) => {
                  const debt = debtByApartment?.get(a.id) ?? 0;
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link className="owner-link" href={`/panel/binalar/menzil/${a.id}`}>
                          {a.apartmentNumber}
                        </Link>
                      </td>
                      <td>{a.floor}</td>
                      <td>{a.roomCount}</td>
                      <td>{a.areaSquareMeters}</td>
                      <td>
                        {a.currentOwner ? (
                          <Link className="owner-link" href={`/panel/binalar/sahibler/${a.currentOwner.id}`}>
                            {a.currentOwner.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className="panel-role-tag">{a.status}</span>
                      </td>
                      <td className="vendor-amount">
                        {debtByApartment === null ? (
                          "…"
                        ) : debt > 0.005 ? (
                          <strong className="vendor-value-danger">{formatMoney(debt)}</strong>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pageNumber={pageNumber} pageCount={pageCount} onChange={setPageNumber} />
        </>
      )}
    </section>
  );
}
