"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  listApartmentsByBuilding,
  listBuildings,
  type Apartment,
  type Building,
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

export function BuildingsView() {
  const auth = useAuth();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apartmentsByBuilding, setApartmentsByBuilding] = useState<
    Record<string, Apartment[] | "loading" | "error">
  >({});

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    listBuildings(auth.accessToken)
      .then(setBuildings)
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function toggleBuilding(building: Building) {
    if (expandedId === building.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(building.id);
    if (apartmentsByBuilding[building.id]) return;

    setApartmentsByBuilding((prev) => ({ ...prev, [building.id]: "loading" }));
    try {
      const apartments = await listApartmentsByBuilding(accessToken, building.id);
      setApartmentsByBuilding((prev) => ({ ...prev, [building.id]: apartments }));
    } catch {
      setApartmentsByBuilding((prev) => ({ ...prev, [building.id]: "error" }));
    }
  }

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

  if (buildings.length === 0) {
    return <p className="panel-page-lead">Hələ heç bir bina qeydə alınmayıb.</p>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Ad</th>
            <th>Ünvan</th>
            <th>Mərtəbə</th>
            <th>Mənzil/mərtəbə</th>
            <th>Ümumi mənzil</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((building) => {
            const apartments = apartmentsByBuilding[building.id];
            const isOpen = expandedId === building.id;
            return (
              <Fragment key={building.id}>
                <tr
                  className="data-table-row-clickable"
                  onClick={() => toggleBuilding(building)}
                >
                  <td>{building.name}</td>
                  <td>{building.fullAddress}</td>
                  <td>{building.totalFloors}</td>
                  <td>{building.apartmentsPerFloor}</td>
                  <td>{building.totalApartments}</td>
                  <td>
                    <span className="panel-role-tag">{building.status}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`${building.id}-detail`}>
                    <td colSpan={6} className="data-table-subrow">
                      {apartments === "loading" && <p>Mənzillər yüklənir…</p>}
                      {apartments === "error" && (
                        <p>Mənzillər yüklənərkən xəta baş verdi.</p>
                      )}
                      {Array.isArray(apartments) &&
                        (apartments.length === 0 ? (
                          <p>Bu binada mənzil qeydə alınmayıb.</p>
                        ) : (
                          <table className="data-table data-table-nested">
                            <thead>
                              <tr>
                                <th>Nömrə</th>
                                <th>Mərtəbə</th>
                                <th>Sahə (m²)</th>
                                <th>Otaq</th>
                                <th>Status</th>
                                <th>Sahibi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {apartments.map((apartment) => (
                                <tr key={apartment.id}>
                                  <td>{apartment.apartmentNumber}</td>
                                  <td>{apartment.floor}</td>
                                  <td>{apartment.areaSquareMeters}</td>
                                  <td>{apartment.roomCount}</td>
                                  <td>{apartment.status}</td>
                                  <td>{apartment.currentOwnerName ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
