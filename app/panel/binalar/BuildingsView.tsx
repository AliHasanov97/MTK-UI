"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  QueryComparisonType,
  SortDirection,
  searchApartments,
  type Apartment,
  type QueryFilter,
} from "../../lib/api/buildings";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Giriş rədd edildi (401/403). Token backend-in gözlədiyi audience ilə uyğun olmaya bilər.";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı. API işə salınıb və CORS icazə verilibmi yoxlayın.";
}

// FullName isn't a mapped column (it's a computed C# expression on Owner),
// so EF can't translate an ORDER BY on it — sorting by "Sahibi" is left out
// on purpose here to avoid a 500 from the backend. The column stays filterable.
type SortColumn = "buildingName" | "apartmentNumber" | "floor" | "roomCount" | "areaSquareMeters" | "status";

type SortState = { column: SortColumn; direction: "asc" | "desc" } | null;

// Maps our UI columns to backend entity property paths for server-side
// sorting. Building.Name sorts alphabetically at the DB level (plain string
// column) — not the natural/numeric-aware order this app uses elsewhere,
// since that would need a persisted sort-key column added on the backend.
const SORT_COLUMN_MAP: Record<SortColumn, string> = {
  buildingName: "Building.Name",
  apartmentNumber: "ApartmentNumber",
  floor: "Floor",
  roomCount: "RoomCount",
  areaSquareMeters: "AreaSquareMeters",
  status: "Status",
};

type FilterOption<T> = { value: T; label: string };

const NO_OWNER = "__NONE__";
const PAGE_SIZE = 10;
// Fetched once (unfiltered, unpaged) purely to populate the filter dropdown
// option lists across the whole dataset — the visible table itself uses a
// separate, properly paginated request below.
const FILTER_OPTIONS_PAGE_SIZE = 1000;

function ColumnFilter<T extends string | number>({
  options,
  selected,
  onChange,
}: {
  options: FilterOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle(value: T) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        const panelWidth = 200;
        setPosition({
          top: rect.bottom + 6,
          left: Math.min(Math.max(8, rect.right - panelWidth), window.innerWidth - panelWidth - 8),
        });
      }
    }
    setOpen((o) => !o);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = normalizedQuery
    ? options.filter((opt) => opt.label.toLowerCase().includes(normalizedQuery))
    : options;

  return (
    <div className="col-filter">
      <button
        ref={btnRef}
        type="button"
        className={`col-filter-btn${selected.length > 0 ? " active" : ""}`}
        onClick={toggleOpen}
      >
        ▾
        {selected.length > 0 && <span className="col-filter-badge">{selected.length}</span>}
      </button>
      {open &&
        position &&
        createPortal(
          <div
            className="col-filter-panel"
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="col-filter-search"
              placeholder="Axtar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="col-filter-options">
              {visibleOptions.length === 0 && <p className="col-filter-empty">Nəticə yoxdur</p>}
              {visibleOptions.map((opt) => (
                <label key={String(opt.value)} className="col-filter-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {selected.length > 0 && (
              <button type="button" className="col-filter-clear" onClick={() => onChange([])}>
                Təmizlə
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{direction === "asc" ? "▲" : "▼"}</span>;
}

export function BuildingsView() {
  const auth = useAuth();
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filterSource, setFilterSource] = useState<Apartment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string[]>([]);
  const [numberFilter, setNumberFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [floorFilter, setFloorFilter] = useState<number[]>([]);
  const [roomFilter, setRoomFilter] = useState<number[]>([]);
  const [areaFilter, setAreaFilter] = useState<number[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Debounce the free-text search box so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Any filter/search/sort change invalidates the current page. Resetting it
  // here (during render, comparing against the previous signature) rather
  // than in an effect avoids an extra cascading render.
  const filterSignature = JSON.stringify([
    buildingFilter,
    numberFilter,
    statusFilter,
    floorFilter,
    roomFilter,
    areaFilter,
    ownerFilter,
    searchTerm,
    sort,
  ]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  // One-time (per session) fetch of the whole dataset, only to build the
  // filter dropdown option lists — independent of whichever page is showing.
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchApartments(auth.accessToken, { pageSize: FILTER_OPTIONS_PAGE_SIZE })
      .then((res) => setFilterSource(res.items))
      .catch(() => {
        /* filter option lists are a nice-to-have; the main table below reports its own errors */
      });
  }, [auth]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    const filters: QueryFilter[] = [];
    if (buildingFilter.length > 0) {
      filters.push({ columnName: "BuildingId", comparison: QueryComparisonType.In, value: buildingFilter });
    }
    if (numberFilter.length > 0) {
      filters.push({ columnName: "ApartmentNumber", comparison: QueryComparisonType.In, value: numberFilter });
    }
    if (statusFilter.length > 0) {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.In, value: statusFilter });
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
    const realOwners = ownerFilter.filter((v) => v !== NO_OWNER);
    const noOwnerSelected = ownerFilter.includes(NO_OWNER);
    if (realOwners.length > 0 && !noOwnerSelected) {
      filters.push({ columnName: "CurrentOwnerId", comparison: QueryComparisonType.In, value: realOwners });
    } else if (noOwnerSelected && realOwners.length === 0) {
      filters.push({ columnName: "CurrentOwnerId", comparison: QueryComparisonType.IsNull });
    }
    // Selecting "Sahibsiz" together with specific owners at the same time can't
    // be expressed as one AND-combined filter list server-side (it needs an
    // OR the backend's filter engine doesn't support yet) — in that mixed
    // case we deliberately send no owner filter at all rather than silently
    // returning the wrong rows.

    const sortCriteria = sort
      ? {
          columnName: SORT_COLUMN_MAP[sort.column],
          direction: sort.direction === "asc" ? SortDirection.Ascending : SortDirection.Descending,
        }
      : null;

    searchApartments(auth.accessToken, {
      filters: filters.length > 0 ? filters : null,
      sortCriteria,
      searchTerm: searchTerm || undefined,
      // Backend's ApplyPages uses `page` directly as a zero-based skip
      // multiplier (Skip(page * pageSize)), regardless of what it echoes
      // back in the response — so our 1-indexed UI state is converted here.
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
    auth,
    buildingFilter,
    numberFilter,
    statusFilter,
    floorFilter,
    roomFilter,
    areaFilter,
    ownerFilter,
    searchTerm,
    sort,
    pageNumber,
  ]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!apartments) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  const source = filterSource ?? [];
  const buildingOptions = Array.from(new Map(source.map((a) => [a.building.id, a.building.name])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
    .map(([id, name]) => ({ value: id, label: name }));
  const uniqueNumbers = Array.from(new Set(source.map((a) => a.apartmentNumber))).sort((x, y) =>
    x.localeCompare(y, undefined, { numeric: true }),
  );
  const uniqueStatuses = Array.from(new Set(source.map((a) => a.status))).sort();
  const uniqueFloors = Array.from(new Set(source.map((a) => a.floor))).sort((x, y) => x - y);
  const uniqueRoomCounts = Array.from(new Set(source.map((a) => a.roomCount))).sort((x, y) => x - y);
  const uniqueAreas = Array.from(new Set(source.map((a) => a.areaSquareMeters))).sort((x, y) => x - y);
  const ownerOptions = [
    ...Array.from(
      new Map(
        source.filter((a) => a.currentOwner).map((a) => [a.currentOwner!.id, a.currentOwner!.name]),
      ).entries(),
    )
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
      .map(([id, name]) => ({ value: id, label: name })),
    { value: NO_OWNER, label: "Sahibsiz" },
  ];

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev?.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (nömrə, bina, sahibi, status…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <div className="th-row">
                  <span className="th-label" onClick={() => handleSort("buildingName")}>
                    Bina <SortIcon active={sort?.column === "buildingName"} direction={sort?.direction ?? "asc"} />
                  </span>
                  <ColumnFilter options={buildingOptions} selected={buildingFilter} onChange={setBuildingFilter} />
                </div>
              </th>
              <th>
                <div className="th-row">
                  <span className="th-label" onClick={() => handleSort("apartmentNumber")}>
                    Nömrə{" "}
                    <SortIcon
                      active={sort?.column === "apartmentNumber"}
                      direction={sort?.direction ?? "asc"}
                    />
                  </span>
                  <ColumnFilter
                    options={uniqueNumbers.map((n) => ({ value: n, label: n }))}
                    selected={numberFilter}
                    onChange={setNumberFilter}
                  />
                </div>
              </th>
              <th>
                <div className="th-row">
                  <span className="th-label" onClick={() => handleSort("floor")}>
                    Mərtəbə <SortIcon active={sort?.column === "floor"} direction={sort?.direction ?? "asc"} />
                  </span>
                  <ColumnFilter
                    options={uniqueFloors.map((floor) => ({ value: floor, label: `${floor}-cü mərtəbə` }))}
                    selected={floorFilter}
                    onChange={setFloorFilter}
                  />
                </div>
              </th>
              <th>
                <div className="th-row">
                  <span className="th-label" onClick={() => handleSort("roomCount")}>
                    Otaq <SortIcon active={sort?.column === "roomCount"} direction={sort?.direction ?? "asc"} />
                  </span>
                  <ColumnFilter
                    options={uniqueRoomCounts.map((rooms) => ({ value: rooms, label: `${rooms} otaqlı` }))}
                    selected={roomFilter}
                    onChange={setRoomFilter}
                  />
                </div>
              </th>
              <th>
                <div className="th-row">
                  <span className="th-label" onClick={() => handleSort("areaSquareMeters")}>
                    Sahə (m²){" "}
                    <SortIcon
                      active={sort?.column === "areaSquareMeters"}
                      direction={sort?.direction ?? "asc"}
                    />
                  </span>
                  <ColumnFilter
                    options={uniqueAreas.map((area) => ({ value: area, label: `${area} m²` }))}
                    selected={areaFilter}
                    onChange={setAreaFilter}
                  />
                </div>
              </th>
              <th>
                <div className="th-row">
                  <span>Sahibi</span>
                  <ColumnFilter options={ownerOptions} selected={ownerFilter} onChange={setOwnerFilter} />
                </div>
              </th>
              <th>
                <div className="th-row">
                  <span className="th-label" onClick={() => handleSort("status")}>
                    Status <SortIcon active={sort?.column === "status"} direction={sort?.direction ?? "asc"} />
                  </span>
                  <ColumnFilter
                    options={uniqueStatuses.map((status) => ({ value: status, label: status }))}
                    selected={statusFilter}
                    onChange={setStatusFilter}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {apartments.length === 0 && (
              <tr>
                <td colSpan={7}>Nəticə tapılmadı.</td>
              </tr>
            )}
            {apartments.map((a) => (
              <tr key={a.id}>
                <td>{a.building.name}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel-pagination">
          <span>
            Cəmi {totalCount} mənzil — səhifə {pageNumber}/{pageCount}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="panel-btn panel-btn-sm"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              Əvvəlki
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-sm"
              disabled={pageNumber >= pageCount}
              onClick={() => setPageNumber((p) => p + 1)}
            >
              Növbəti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
