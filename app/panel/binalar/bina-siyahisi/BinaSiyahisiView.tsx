"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import {
  createApartment,
  createApartmentType,
  createBuilding,
  listApartmentTypes,
  listBuildings,
  searchApartments,
  type Apartment,
  type ApartmentType,
  type Building,
} from "../../../lib/api/buildings";
import { Modal } from "../../Modal";
import { useCreatedByMap } from "../auditHooks";
import { fetchDebtByApartment } from "../bina/[id]/BuildingScheme";

// Every apartment is loaded once to work out the per-building counts below.
const APARTMENT_FETCH_SIZE = 5000;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type BuildingStats = { apartments: number; owned: number; debt: number; debtors: number };

export function BinaSiyahisiView() {
  const auth = useAuth();
  const router = useRouter();
  const canManage = useCanDoEverything();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [debtByApartment, setDebtByApartment] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const createdBy = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "Building");

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    listBuildings(auth.accessToken)
      .then((res) => {
        setBuildings(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  // The extra columns are a nice-to-have: if they fail the list still renders.
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const accessToken = auth.accessToken;
    searchApartments(accessToken, { pageSize: APARTMENT_FETCH_SIZE })
      .then((res) => {
        setApartments(res.items);
        return fetchDebtByApartment(accessToken, res.items.map((a) => a.id)).then(setDebtByApartment);
      })
      .catch(() => {
        setApartments((current) => current ?? []);
        setDebtByApartment((current) => current ?? new Map());
      });
  }, [auth]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!buildings) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  const stats = new Map<string, BuildingStats>();
  for (const a of apartments ?? []) {
    const s = stats.get(a.building.id) ?? { apartments: 0, owned: 0, debt: 0, debtors: 0 };
    const debt = debtByApartment?.get(a.id) ?? 0;
    s.apartments += 1;
    if (a.currentOwner) s.owned += 1;
    if (debt > 0.005) {
      s.debt += debt;
      s.debtors += 1;
    }
    stats.set(a.building.id, s);
  }

  return (
    <div>
      <div className="panel-toolbar">
        <span style={{ flex: 1 }} />
        {canManage && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
            + Yeni bina
          </button>
        )}
      </div>

      <div className="data-table-wrap">
        <div className="owner-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Ünvan</th>
                <th className="vendor-th-amount">Mənzil</th>
                <th>Doluluq</th>
                <th className="vendor-th-amount">Açıq borc</th>
                <th>Status</th>
                <th>Yaradan</th>
              </tr>
            </thead>
            <tbody>
              {buildings.length === 0 && (
                <tr>
                  <td colSpan={7}>Hələ heç bir bina qeydə alınmayıb.</td>
                </tr>
              )}
              {buildings.map((b) => {
                const s = stats.get(b.id);
                const occupancy = s && s.apartments > 0 ? Math.round((s.owned / s.apartments) * 100) : 0;
                return (
                  <tr
                    key={b.id}
                    className="data-table-row-clickable"
                    title="Bina səhifəsinə keç"
                    onClick={() => router.push(`/panel/binalar/bina/${b.id}`)}
                  >
                    <td className="vendor-cell-vendor">
                      <Link
                        className="owner-link"
                        href={`/panel/binalar/bina/${b.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {b.name}
                      </Link>
                      {b.description && <span className="vendor-cell-sub">{b.description}</span>}
                    </td>
                    <td>{b.fullAddress}</td>
                    <td className="vendor-amount">{apartments ? (s?.apartments ?? 0) : "…"}</td>
                    <td>
                      {!apartments ? (
                        "…"
                      ) : !s ? (
                        "—"
                      ) : (
                        <div className="bina-occupancy">
                          <div className="bview-meter" aria-hidden="true">
                            <span style={{ width: `${occupancy}%` }} />
                          </div>
                          <span>
                            <strong>{occupancy}%</strong> · {s.owned} sahibli, {s.apartments - s.owned} boş
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="vendor-amount">
                      {!debtByApartment ? (
                        "…"
                      ) : s && s.debt > 0.005 ? (
                        <>
                          <strong className="vendor-value-danger">{money.format(s.debt)} ₼</strong>
                          <span className="vendor-cell-sub">{s.debtors} borclu mənzil</span>
                        </>
                      ) : (
                        <span className="vendor-value-ok">Borc yoxdur</span>
                      )}
                    </td>
                    <td>
                      <span className="panel-role-tag">{b.status}</span>
                    </td>
                    <td>{createdBy[b.id] ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateBuildingModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateBuildingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
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
      await createBuilding(accessToken, {
        name,
        street,
        city,
        district: district || null,
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
    <Modal title="Yeni bina" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="building-name">Ad</label>
          <input id="building-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="building-street">Küçə</label>
            <input id="building-street" required value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="building-city">Şəhər</label>
            <input id="building-city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="building-district">Rayon</label>
          <input id="building-district" value={district} onChange={(e) => setDistrict(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="building-description">Qeyd</label>
          <input id="building-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
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

export function CreateApartmentModal({
  building,
  onClose,
  onSaved,
}: {
  building: Building;
  onClose: () => void;
  /** Called once the apartment is created (the modal stays open on its success message). */
  onSaved?: () => void;
}) {
  const auth = useAuth();
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [types, setTypes] = useState<ApartmentType[] | null>(null);
  const [apartmentTypeId, setApartmentTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const accessToken = auth.status === "authenticated" ? auth.accessToken : "";

  useEffect(() => {
    if (!accessToken) return;
    listApartmentTypes(accessToken, building.id)
      .then(setTypes)
      .catch((err) => setError(errorMessage(err)));
  }, [accessToken, building.id]);

  if (auth.status !== "authenticated") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createApartment(accessToken, {
        buildingId: building.id,
        apartmentNumber,
        floor: Number(floor),
        apartmentTypeId,
      });
      setDone(true);
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${building.name} — yeni mənzil`} onClose={onClose}>
      {done ? (
        <div>
          <p className="panel-page-lead">Mənzil uğurla yaradıldı.</p>
          <div className="form-actions">
            <button type="button" className="panel-btn panel-btn-primary" onClick={onClose}>
              Bağla
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="apartment-number">Mənzil nömrəsi</label>
              <input
                id="apartment-number"
                required
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="apartment-floor">Mərtəbə</label>
              <input
                id="apartment-floor"
                type="number"
                min={1}
                required
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="apartment-type">Mənzil tipi</label>
            <select
              id="apartment-type"
              required
              value={apartmentTypeId}
              onChange={(e) => setApartmentTypeId(e.target.value)}
              disabled={!types || types.length === 0}
            >
              <option value="">{types && types.length === 0 ? "Bu binada tip yoxdur" : "Seçin…"}</option>
              {types?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.roomCount} otaq — {t.areaSquareMeters} m²
                </option>
              ))}
            </select>
            {types && types.length === 0 && (
              <p className="panel-page-lead">Əvvəlcə “Mənzil tipləri” bölməsindən tip əlavə edin.</p>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={onClose}>
              Ləğv et
            </button>
            <button type="submit" className="panel-btn panel-btn-primary" disabled={saving || !apartmentTypeId}>
              {saving ? "Saxlanılır…" : "Yarat"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function ApartmentTypesModal({ building, onClose }: { building: Building; onClose: () => void }) {
  const auth = useAuth();
  const accessToken = auth.status === "authenticated" ? auth.accessToken : "";
  const [types, setTypes] = useState<ApartmentType[] | null>(null);
  const [roomCount, setRoomCount] = useState("1");
  const [areaSquareMeters, setAreaSquareMeters] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    listApartmentTypes(accessToken, building.id)
      .then(setTypes)
      .catch((err) => setError(errorMessage(err)));
  }, [accessToken, building.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createApartmentType(accessToken, building.id, {
        roomCount: Number(roomCount),
        areaSquareMeters: Number(areaSquareMeters),
      });
      setRoomCount("1");
      setAreaSquareMeters("");
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${building.name} — mənzil tipləri`} onClose={onClose}>
      {error && <p className="form-error">{error}</p>}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Otaq sayı</th>
              <th>Sahə (m²)</th>
            </tr>
          </thead>
          <tbody>
            {!types && (
              <tr>
                <td colSpan={2}>Yüklənir…</td>
              </tr>
            )}
            {types?.length === 0 && (
              <tr>
                <td colSpan={2}>Hələ heç bir tip əlavə edilməyib.</td>
              </tr>
            )}
            {types?.map((t) => (
              <tr key={t.id}>
                <td>{t.roomCount}</td>
                <td>{t.areaSquareMeters}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="type-rooms">Otaq sayı</label>
            <input
              id="type-rooms"
              type="number"
              min={1}
              required
              value={roomCount}
              onChange={(e) => setRoomCount(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="type-area">Sahə (m²)</label>
            <input
              id="type-area"
              type="number"
              min={1}
              step="0.1"
              required
              value={areaSquareMeters}
              onChange={(e) => setAreaSquareMeters(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Bağla
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Tip əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
