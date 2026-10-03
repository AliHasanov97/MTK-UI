"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanPay } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { getOwnerById, type Owner, type OwnerListItem } from "../../../lib/api/owners";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../../lib/api/garages";
import { type Apartment } from "../../../lib/api/buildings";
import { getChargesByOwner, getPaymentsByOwner, type ChargeResponse, type PaymentResponse, type PropertyTypeKey } from "../../../lib/api/payments";
import { OwnerPicker } from "../../binalar/OwnerPicker";
import { ApartmentPicker } from "../../binalar/ApartmentPicker";
import { PaymentForm, PaymentsTable } from "../../binalar/finance";

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
  const canPay = useCanPay();
  const [searchMode, setSearchMode] = useState<"owner" | "apartment">("owner");
  const [selectedOwner, setSelectedOwner] = useState<OwnerListItem | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<Owner | null>(null);
  const [target, setTarget] = useState("");
  const [recent, setRecent] = useState<PaymentResponse[]>([]);
  const [ownerCharges, setOwnerCharges] = useState<ChargeResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  function switchSearchMode(mode: "owner" | "apartment") {
    setSearchMode(mode);
    setSelectedOwner(null);
    setSelectedApartment(null);
    setTarget("");
    setError(null);
  }

  function handleOwnerPicked(owner: OwnerListItem | null) {
    setSelectedOwner(owner);
    setTarget("");
  }

  // Mənzil seçiləndə onun cari sahibini tapıb həmin sahibi seçilmiş kimi
  // qeyd edir və "Hədəf" seçimini birbaşa bu mənzilə yönəldir — sahibi
  // axtarıb sonra mənzili siyahıdan seçməyə ehtiyac qalmır.
  function handleApartmentPicked(apartment: Apartment | null) {
    setSelectedApartment(apartment);
    if (!apartment) {
      setSelectedOwner(null);
      setTarget("");
      return;
    }
    if (!apartment.currentOwner) {
      setSelectedOwner(null);
      setTarget("");
      setError("Bu mənzilin hazırda sahibi yoxdur.");
      return;
    }
    if (auth.status !== "authenticated") return;
    getOwnerById(auth.accessToken, apartment.currentOwner.id)
      .then((owner) => {
        setSelectedOwner(owner);
        setTarget(encodeTarget("Apartment", apartment.id));
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }

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
    getOwnerById(auth.accessToken, selectedOwner.id)
      .then((res) => {
        setOwnerDetail(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
    loadRecent(selectedOwner.id);
    // Qalıq borc həddi üçün sahibin bütün haqqları (hər əmlaka düşən hissəsi ayrıca hesablanır).
    getChargesByOwner(auth.accessToken, selectedOwner.id)
      .then(setOwnerCharges)
      .catch(() => setOwnerCharges([]));
  }, [auth, selectedOwner, loadRecent]);

  if (auth.status !== "authenticated") return null;

  const { propertyId, propertyType } = decodeTarget(target);

  // Əmlak seçilibsə, həmin əmlakın qalıq borcu ödənişin yuxarı həddidir (avans
  // yalnız ümumi sahib ödənişində mümkündür — backend də bunu təsdiqləyir).
  const targetedDebt = propertyId
    ? ownerCharges
        .filter((c) => c.propertyId === propertyId)
        .reduce((sum, c) => sum + (c.amount - c.paidAmount), 0)
    : 0;

  return (
    <div className="panel-page">
      <h1>Ödənişlərin daxil edilməsi</h1>
      <p className="panel-page-lead">
        Sahibi və ya birbaşa mənzili axtararaq seçin, istəsəniz konkret mənzil/qaraja hədəfləyin,
        sonra ödənişi qeyd edin. Əmlaka hədəflənmiş ödəniş yalnız həmin əmlakın qalıq borcunu ödəyə
        bilər — avans üçün «Ümumi» seçin.
      </p>

      {error && <p className="form-error">{error}</p>}

      <section className="panel-card owner-section-card">
        <h4>Axtarış</h4>
        <div className="vendor-segments">
          <button
            type="button"
            className={searchMode === "owner" ? "active" : ""}
            onClick={() => switchSearchMode("owner")}
          >
            Sahibə görə
          </button>
          <button
            type="button"
            className={searchMode === "apartment" ? "active" : ""}
            onClick={() => switchSearchMode("apartment")}
          >
            Mənzilə görə
          </button>
        </div>
        {searchMode === "owner" ? (
          <OwnerPicker selected={selectedOwner} onSelect={handleOwnerPicked} />
        ) : (
          <ApartmentPicker selected={selectedApartment} onSelect={handleApartmentPicked} />
        )}
      </section>

      {selectedOwner && ownerDetail && (
        <>
          {canPay && (
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
                suggestedAmount={propertyId ? Math.max(0, targetedDebt) : 0}
                onSaved={() => loadRecent(selectedOwner.id)}
              />
            </section>
          )}

          <PaymentsTable
            accessToken={auth.accessToken}
            payments={recent}
            title={`Son ödənişlər — ${ownerDetail.fullName}`}
          />
          <p className="panel-page-lead" style={{ marginTop: -8 }}>
            Bütün tarixçə üçün <Link className="owner-link" href={`/panel/binalar/sahibler/${selectedOwner.id}`}>sahibin profilinə</Link> baxın.
          </p>
        </>
      )}
    </div>
  );
}
