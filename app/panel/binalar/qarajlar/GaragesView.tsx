"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError } from "../../../lib/api/client";
import { SortDirection } from "../../../lib/api/buildings";
import type { OwnerListItem } from "../../../lib/api/owners";
import {
  GARAGE_TYPE_LABELS,
  createGarage,
  searchGarages,
  type GarageTypeKey,
  type GarageListItem,
} from "../../../lib/api/garages";
import { Modal } from "../../Modal";
import { OwnerPicker } from "../OwnerPicker";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Giriş rədd edildi (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

// Owner is left out on purpose: Owner.FullName is a computed C# property
// (FirstName + " " + LastName), not a mapped column, so EF can't translate
// an ORDER BY on it — the same limitation apartments' Sahibi sort has.
type SortColumn = "garageNumber" | "type";

type SortState = { column: SortColumn; direction: "asc" | "desc" } | null;

const SORT_COLUMN_MAP: Record<SortColumn, string> = {
  garageNumber: "GarageNumber",
  type: "Type",
};

const PAGE_SIZE = 10;

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{direction === "asc" ? "▲" : "▼"}</span>;
}

export function GaragesView() {
  const auth = useAuth();
  const [garages, setGarages] = useState<GarageListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterSignature = JSON.stringify([searchTerm, sort]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    const sortCriteria = sort
      ? {
          columnName: SORT_COLUMN_MAP[sort.column],
          direction: sort.direction === "asc" ? SortDirection.Ascending : SortDirection.Descending,
        }
      : null;

    searchGarages(auth.accessToken, {
      sortCriteria,
      searchTerm: searchTerm || undefined,
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setGarages(res.items);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, sort, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!garages) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

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
          placeholder="Axtar (nömrə, növ, sahibi…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
          + Yeni qaraj
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <span className="th-label" onClick={() => handleSort("garageNumber")}>
                  Nömrə <SortIcon active={sort?.column === "garageNumber"} direction={sort?.direction ?? "asc"} />
                </span>
              </th>
              <th>
                <span className="th-label" onClick={() => handleSort("type")}>
                  Növ <SortIcon active={sort?.column === "type"} direction={sort?.direction ?? "asc"} />
                </span>
              </th>
              <th>Qeyd</th>
              <th>Sahibi</th>
            </tr>
          </thead>
          <tbody>
            {garages.length === 0 && (
              <tr>
                <td colSpan={4}>Nəticə tapılmadı.</td>
              </tr>
            )}
            {garages.map((g) => (
              <tr key={g.id}>
                <td>
                  <Link className="owner-link" href={`/panel/binalar/qaraj/${g.id}`}>
                    {g.garageNumber}
                  </Link>
                </td>
                <td>{GARAGE_TYPE_LABELS[g.type as GarageTypeKey] ?? g.type}</td>
                <td>{g.description ?? "—"}</td>
                <td>
                  {g.owner ? (
                    <Link className="owner-link" href={`/panel/binalar/sahibler/${g.owner.id}`}>
                      {g.owner.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel-pagination">
          <span>
            Cəmi {totalCount} qaraj — səhifə {pageNumber}/{pageCount}
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

      {showCreate && (
        <CreateGarageModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function CreateGarageModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const [owner, setOwner] = useState<OwnerListItem | null>(null);
  const [garageNumber, setGarageNumber] = useState("");
  const [garageType, setGarageType] = useState<GarageTypeKey>("OpenParking");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createGarage(accessToken, {
        ownerId: owner?.id ?? null,
        garageNumber,
        garageType,
        description: description || null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni qaraj" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="garage-number">Nömrə</label>
            <input
              id="garage-number"
              required
              value={garageNumber}
              onChange={(e) => setGarageNumber(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="garage-type">Növ</label>
            <select
              id="garage-type"
              value={garageType}
              onChange={(e) => setGarageType(e.target.value as GarageTypeKey)}
            >
              {(Object.keys(GARAGE_TYPE_LABELS) as GarageTypeKey[]).map((key) => (
                <option key={key} value={key}>
                  {GARAGE_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="garage-description">Qeyd</label>
          <input id="garage-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <OwnerPicker selected={owner} onSelect={setOwner} label="Sahib (istəyə bağlı)" />
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
