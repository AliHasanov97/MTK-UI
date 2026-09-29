"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError } from "../../../lib/api/client";
import { getOwnerById, type Owner, type OwnerListItem } from "../../../lib/api/owners";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../../lib/api/garages";
import { getPaymentsByOwner, PAYMENT_METHOD_LABELS, paymentMethodFromOrdinal, paymentStatusFromOrdinal, type PaymentResponse, type PropertyTypeKey } from "../../../lib/api/payments";
import { OwnerPicker } from "../../binalar/OwnerPicker";
import { PaymentForm } from "../../binalar/finance";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

// Encodes which property (if any) the payment should target, as a single
// <select> value: "" = general/untargeted, "apartment:<id>" / "garage:<id>" otherwise.
function encodeTarget(type: PropertyTypeKey, id: string) {
  return `${type.toLowerCase()}:${id}`;
}

function decodeTarget(value: string): { propertyId: string | null; propertyType: PropertyTypeKey | null } {
  if (!value) return { propertyId: null, propertyType: null };
  const [kind, id] = value.split(":");
  return { propertyId: id, propertyType: kind === "apartment" ? "Apartment" : "Garage" };
}

export function OdenislerView() {
  const auth = useAuth();
  const [selectedOwner, setSelectedOwner] = useState<OwnerListItem | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<Owner | null>(null);
  const [target, setTarget] = useState("");
  const [recent, setRecent] = useState<PaymentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(
    (ownerId: string) => {
      if (auth.status !== "authenticated") return;
      getPaymentsByOwner(auth.accessToken, ownerId)
        .then((payments) => setRecent(payments.slice(0, 10)))
        .catch((err) => setError(errorMessage(err)));
    },
    [auth],
  );

  useEffect(() => {
    if (auth.status !== "authenticated" || !selectedOwner) {
      Promise.resolve().then(() => {
        setOwnerDetail(null);
        setRecent([]);
      });
      return;
    }
    Promise.resolve().then(() => setTarget(""));
    getOwnerById(auth.accessToken, selectedOwner.id)
      .then((res) => {
        setOwnerDetail(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
    loadRecent(selectedOwner.id);
  }, [auth, selectedOwner, loadRecent]);

  if (auth.status !== "authenticated") return null;

  const { propertyId, propertyType } = decodeTarget(target);

  return (
    <div className="panel-page">
      <h1>Ödənişlərin daxil edilməsi</h1>
      <p className="panel-page-lead">
        Sahib seçin, istəsəniz konkret mənzil/qaraja hədəfləyin, sonra ödənişi qeyd edin.
      </p>

      {error && <p className="form-error">{error}</p>}

      <section className="panel-card owner-section-card">
        <h4>Sahib</h4>
        <OwnerPicker selected={selectedOwner} onSelect={setSelectedOwner} />
      </section>

      {selectedOwner && ownerDetail && (
        <>
          <section className="panel-card owner-section-card">
            <h4>Ödəniş</h4>
            <div className="form-field">
              <label htmlFor="pay-target">Hədəf</label>
              <select id="pay-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Ümumi (konkret mənzil/qaraja bağlı deyil)</option>
                {ownerDetail.apartments.map((a) => (
                  <option key={a.id} value={encodeTarget("Apartment", a.id)}>
                    Mənzil {a.apartmentNumber} — {a.building.name}
                  </option>
                ))}
                {ownerDetail.garages.map((g) => (
                  <option key={g.id} value={encodeTarget("Garage", g.id)}>
                    Qaraj {g.garageNumber} ({GARAGE_TYPE_LABELS[g.type as GarageTypeKey] ?? g.type})
                  </option>
                ))}
              </select>
            </div>
            <PaymentForm
              accessToken={auth.accessToken}
              ownerId={selectedOwner.id}
              propertyId={propertyId}
              propertyType={propertyType}
              onSaved={() => loadRecent(selectedOwner.id)}
            />
          </section>

          <section className="panel-card owner-section-card">
            <h4>Son ödənişlər — {ownerDetail.fullName}</h4>
            {recent.length === 0 ? (
              <p className="panel-page-lead">Bu sahibin hələ heç bir ödənişi yoxdur.</p>
            ) : (
              <div className="owner-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarix</th>
                      <th>Məbləğ (₼)</th>
                      <th>Üsul</th>
                      <th>İstinad</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => {
                      const status = paymentStatusFromOrdinal(p.status);
                      return (
                        <tr key={p.id}>
                          <td>{p.paymentDate.slice(0, 10)}</td>
                          <td>{p.amount.toFixed(2)}</td>
                          <td>{PAYMENT_METHOD_LABELS[paymentMethodFromOrdinal(p.paymentMethod)]}</td>
                          <td>{p.reference ?? "—"}</td>
                          <td>
                            <span className={`panel-role-tag${status === "Cancelled" ? " panel-role-tag-inactive" : ""}`}>
                              {status === "Completed" ? "Tamamlanıb" : status === "Cancelled" ? "Ləğv edilib" : "Gözləyir"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="panel-page-lead" style={{ marginTop: 12 }}>
              Bütün tarixçə üçün <Link className="owner-link" href={`/panel/binalar/sahibler/${selectedOwner.id}`}>sahibin profilinə</Link> baxın.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
