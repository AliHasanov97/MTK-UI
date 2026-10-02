"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { createApartment, createBuilding, listBuildings, type Building } from "../../../lib/api/buildings";
import { Modal } from "../../Modal";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function BinaSiyahisiView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [apartmentBuilding, setApartmentBuilding] = useState<Building | null>(null);

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
        <table className="data-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Ünvan</th>
              <th>Mərtəbə sayı</th>
              <th>Mənzil/mərtəbə</th>
              <th>Tutum</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {buildings.length === 0 && (
              <tr>
                <td colSpan={7}>Hələ heç bir bina qeydə alınmayıb.</td>
              </tr>
            )}
            {buildings.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.fullAddress}</td>
                <td>{b.totalFloors}</td>
                <td>{b.apartmentsPerFloor}</td>
                <td>{b.totalApartments}</td>
                <td>
                  <span className="panel-role-tag">{b.status}</span>
                </td>
                <td>
                  {canManage && (
                    <button
                      type="button"
                      className="panel-btn panel-btn-sm"
                      onClick={() => setApartmentBuilding(b)}
                    >
                      + Mənzil
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {apartmentBuilding && (
        <CreateApartmentModal building={apartmentBuilding} onClose={() => setApartmentBuilding(null)} />
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
  const [totalFloors, setTotalFloors] = useState("1");
  const [apartmentsPerFloor, setApartmentsPerFloor] = useState("1");
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
        totalFloors: Number(totalFloors),
        apartmentsPerFloor: Number(apartmentsPerFloor),
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
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="building-floors">Mərtəbə sayı</label>
            <input
              id="building-floors"
              type="number"
              min={1}
              required
              value={totalFloors}
              onChange={(e) => setTotalFloors(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="building-apf">Mənzil / mərtəbə</label>
            <input
              id="building-apf"
              type="number"
              min={1}
              required
              value={apartmentsPerFloor}
              onChange={(e) => setApartmentsPerFloor(e.target.value)}
            />
          </div>
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

function CreateApartmentModal({ building, onClose }: { building: Building; onClose: () => void }) {
  const auth = useAuth();
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [areaSquareMeters, setAreaSquareMeters] = useState("");
  const [roomCount, setRoomCount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createApartment(accessToken, {
        buildingId: building.id,
        apartmentNumber,
        floor: Number(floor),
        areaSquareMeters: Number(areaSquareMeters),
        roomCount: Number(roomCount),
      });
      setDone(true);
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
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="apartment-area">Sahə (m²)</label>
              <input
                id="apartment-area"
                type="number"
                min={1}
                step="0.1"
                required
                value={areaSquareMeters}
                onChange={(e) => setAreaSquareMeters(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="apartment-rooms">Otaq sayı</label>
              <input
                id="apartment-rooms"
                type="number"
                min={1}
                required
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
              />
            </div>
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
      )}
    </Modal>
  );
}
