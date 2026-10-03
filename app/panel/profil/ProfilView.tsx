"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/format";
import { getCurrentUser } from "../../lib/api/identity";
import { getOwnerByUserId, type Owner } from "../../lib/api/owners";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../lib/api/garages";
import { BalanceTag, OwnerChargesPanel, OwnerPaymentsPanel, formatSigned, useCreatedBy } from "../binalar/finance";
import { getOwnerBalance, getPropertyBalance, searchPayments } from "../../lib/api/payments";
import { QueryComparisonType, SortDirection } from "../../lib/api/buildings";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    if (err.status === 404) return "Sizin adınıza bağlı sahib qeydi tapılmadı. Zəhmət olmasa idarəçi ilə əlaqə saxlayın.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Sahibin öz məlumatını göstərir. Mənzil/qaraj sətirləri öz detal
// səhifəsinə keçid verir (/menzil/[id], /qaraj/[id]) — həmin səhifələr
// özləri "bu, həqiqətən mənimdir?" yoxlaması aparır (useMyOwnerId), ona görə
// burdan başqa sakinin əmlakına keçid açılma riski yoxdur.
//
// Haqqlar/Ödənişlər OwnerChargesPanel/OwnerPaymentsPanel ilə göstərilir —
// bunlar özləri server-side axtarış+səhifələmə aparır (PartyId filtri ilə
// mövcud /search endpoint-lərindən istifadə edir), çünki illər üzrə yığılan
// tam siyahını bir dəfəyə çəkib göstərmək səhifəni ağırlaşdırır.
export function ProfilView() {
  const auth = useAuth();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownerBalance, setOwnerBalance] = useState(0);
  const [ownerBalanceId, setOwnerBalanceId] = useState("");
  const [lastPaymentDate, setLastPaymentDate] = useState<string | null>(null);
  const [propertyBalances, setPropertyBalances] = useState<Record<string, number>>({});
  const balanceCreatedBy = useCreatedBy(
    auth.status === "authenticated" ? auth.accessToken : "",
    "OwnerBalance",
    ownerBalanceId,
  );

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getCurrentUser(auth.accessToken)
      .then((user) => getOwnerByUserId(auth.accessToken, user.id))
      .then((res) => {
        setOwner(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const loadSummary = useCallback(() => {
    if (auth.status !== "authenticated" || !owner) return;
    getOwnerBalance(auth.accessToken, owner.id)
      .then((balance) => {
        setOwnerBalance(balance.currentBalance);
        setOwnerBalanceId(balance.id);
      })
      .catch(() => {
        // Surfaced via the hero stat defaulting to 0; not worth a page-level error.
      });
    searchPayments(auth.accessToken, {
      filters: [{ columnName: "PartyId", comparison: QueryComparisonType.Equals, value: owner.id }],
      sortCriteria: { columnName: "PaymentDate", direction: SortDirection.Descending },
      page: 0,
      pageSize: 1,
    })
      .then((res) => setLastPaymentDate(res.payments[0]?.paymentDate ?? null))
      .catch(() => {
        // Surfaced via the hero stat staying empty.
      });
  }, [auth, owner]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadPropertyBalances = useCallback(() => {
    if (auth.status !== "authenticated" || !owner) return;
    const propertyIds = [...owner.apartments.map((a) => a.id), ...owner.garages.map((g) => g.id)];
    if (propertyIds.length === 0) {
      Promise.resolve().then(() => setPropertyBalances({}));
      return;
    }
    Promise.all(
      propertyIds.map((id) =>
        getPropertyBalance(auth.accessToken, id).then((b) => [id, b.currentBalance] as const),
      ),
    )
      .then((pairs) => setPropertyBalances(Object.fromEntries(pairs)))
      .catch(() => {
        // Surfaced via the per-row BalanceTag defaulting to 0; not worth a page-level error.
      });
  }, [auth, owner]);

  useEffect(() => {
    loadPropertyBalances();
  }, [loadPropertyBalances]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!owner) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  return (
    <div className="owner-dashboard">
      <div className="owner-hero">
        <div className="owner-hero-top">
          <div className="owner-avatar">{initials(owner.fullName)}</div>
          <div className="owner-hero-body">
            <h2>{owner.fullName}</h2>
            <div className="owner-hero-meta">
              <span>{owner.email}</span>
              <span>{owner.phoneNumber}</span>
            </div>
          </div>
          <span className={`panel-role-tag${owner.isActive ? "" : " panel-role-tag-inactive"}`}>
            {owner.isActive ? "Aktiv" : "Deaktiv"}
          </span>
        </div>
        <div className="owner-hero-stats">
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Ümumi balans</span>
            <strong
              className={
                ownerBalance < 0 ? "owner-balance-tag-debt" : ownerBalance > 0 ? "owner-balance-tag-credit" : ""
              }
            >
              {formatSigned(ownerBalance)}
            </strong>
            {balanceCreatedBy && <span className="payment-document-byline">Əməliyyatı icra etdi: {balanceCreatedBy}</span>}
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Son ödəniş</span>
            <strong>{formatDateTime(lastPaymentDate)}</strong>
          </div>
        </div>
      </div>

      <div className="owner-split-row-8-4">
        <section className="panel-card owner-section-card">
          <h4>
            <span className="panel-card-icon owner-section-icon">⌂</span>
            Mənzillərim
          </h4>
          {owner.apartments.length === 0 ? (
            <p className="panel-page-lead">Adınıza heç bir mənzil qeydə alınmayıb.</p>
          ) : (
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bina</th>
                    <th>Nömrə</th>
                    <th>Mərtəbə</th>
                    <th>Otaq</th>
                    <th>Sahə (m²)</th>
                    <th>Status</th>
                    <th>Balans</th>
                  </tr>
                </thead>
                <tbody>
                  {owner.apartments.map((a) => (
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
                        <span className="panel-role-tag">{a.status}</span>
                      </td>
                      <td>
                        <BalanceTag balance={propertyBalances[a.id] ?? 0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel-card owner-section-card">
          <h4>
            <span className="panel-card-icon owner-section-icon">▭</span>
            Qarajlarım
          </h4>
          {owner.garages.length === 0 ? (
            <p className="panel-page-lead">Adınıza heç bir qaraj qeydə alınmayıb.</p>
          ) : (
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nömrə</th>
                    <th>Növ</th>
                    <th>Qeyd</th>
                    <th>Balans</th>
                  </tr>
                </thead>
                <tbody>
                  {owner.garages.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <Link className="owner-link" href={`/panel/binalar/qaraj/${g.id}`}>
                          {g.garageNumber}
                        </Link>
                      </td>
                      <td>{GARAGE_TYPE_LABELS[g.type as GarageTypeKey] ?? g.type}</td>
                      <td>{g.description ?? "—"}</td>
                      <td>
                        <BalanceTag balance={propertyBalances[g.id] ?? 0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="owner-split-row-8-4">
        <OwnerChargesPanel accessToken={auth.accessToken} ownerId={owner.id} />
        <OwnerPaymentsPanel accessToken={auth.accessToken} ownerId={owner.id} />
      </div>
    </div>
  );
}
