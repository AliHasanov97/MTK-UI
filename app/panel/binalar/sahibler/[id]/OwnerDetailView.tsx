"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../../lib/auth/roles";
import { ApiError } from "../../../../lib/api/client";
import { formatDateTime } from "../../../../lib/format";
import { getOwnerById, linkOwnerToUser, type Owner } from "../../../../lib/api/owners";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../../../lib/api/garages";
import type { UserSummary } from "../../../../lib/api/identity";
import { Modal } from "../../../Modal";
import { UserPicker } from "../../UserPicker";
import { BalanceTag, ChargesTable, PaymentsTable, PayButton, formatSigned, lastPaymentDate } from "../../finance";
import {
  getChargesByOwner,
  getOwnerBalance,
  getPaymentsByOwner,
  getPropertyBalance,
  propertyTypeFromOrdinal,
  type ChargeResponse,
} from "../../../../lib/api/payments";
import { resolvePropertyLabels, type PropertyRef } from "../../resolve";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    if (err.status === 404) {
      return "Sahib tapılmadı.";
    }
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

export function OwnerDetailView({ ownerId }: { ownerId: string }) {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPaymentsByOwner>>>([]);
  const [ownerBalance, setOwnerBalance] = useState(0);
  const [propertyBalances, setPropertyBalances] = useState<Record<string, number>>({});
  const [propertyLabels, setPropertyLabels] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getOwnerById(auth.accessToken, ownerId)
      .then((res) => {
        setOwner(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadFinance = useCallback(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([
      getChargesByOwner(auth.accessToken, ownerId),
      getPaymentsByOwner(auth.accessToken, ownerId),
      getOwnerBalance(auth.accessToken, ownerId),
    ])
      .then(([chargeList, paymentList, balance]) => {
        setCharges(chargeList);
        setPayments(paymentList);
        setOwnerBalance(balance.currentBalance);
      })
      .catch(() => {
        // Surfaced via the empty tables; the page's primary error state is the owner fetch above.
      });
  }, [auth, ownerId]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  // Needs owner.apartments/garages for their ids, so it waits on `owner` rather
  // than firing off ownerId alone like loadFinance does.
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

  // Resolved directly from the charges/payments themselves (not owner.apartments/
  // garages) so a unit transferred away AFTER its charge/payment history was
  // created still shows its name here instead of "—" — owner.apartments only
  // reflects CURRENT ownership.
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const refs: PropertyRef[] = [
      ...charges
        .filter((c) => c.propertyId != null && c.propertyType != null)
        .map((c) => ({ propertyType: propertyTypeFromOrdinal(c.propertyType!), propertyId: c.propertyId! })),
      ...payments
        .filter((p) => p.propertyId != null && p.propertyType != null)
        .map((p) => ({ propertyType: propertyTypeFromOrdinal(p.propertyType!), propertyId: p.propertyId! })),
    ];
    if (refs.length === 0) {
      Promise.resolve().then(() => setPropertyLabels({}));
      return;
    }
    resolvePropertyLabels(auth.accessToken, refs).then(setPropertyLabels);
  }, [auth, charges, payments]);

  const reloadAll = useCallback(() => {
    loadFinance();
    loadPropertyBalances();
  }, [loadFinance, loadPropertyBalances]);

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

  const lastPayment = lastPaymentDate(payments);

  return (
    <div className="owner-dashboard">
      <Link className="owner-back-link" href="/panel/binalar">
        ← Mənzillərə qayıt
      </Link>

      <div className="owner-hero">
        <div className="owner-hero-top">
          <div className="owner-avatar">{initials(owner.fullName)}</div>
          <div className="owner-hero-body">
            <h2>{owner.fullName}</h2>
            <div className="owner-hero-meta">
              <span>{owner.email}</span>
              <span>{owner.phoneNumber}</span>
              <span>{owner.userId ? "Qeydiyyatlı istifadəçi" : "Passiv sahib (hesabı yoxdur)"}</span>
            </div>
          </div>
          {canManage && !owner.userId && (
            <button
              type="button"
              className="panel-btn panel-btn-sm panel-btn-primary"
              onClick={() => setShowLink(true)}
            >
              Hesaba bağla
            </button>
          )}
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
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Son ödəniş</span>
            <strong>{formatDateTime(lastPayment)}</strong>
          </div>
        </div>
      </div>

      <section className="panel-card owner-section-card">
        <h4>
          <span className="panel-card-icon owner-section-icon">⌂</span>
          Mənzillər
        </h4>
        {owner.apartments.length === 0 ? (
          <p className="panel-page-lead">Bu sahibin adına heç bir mənzil qeydə alınmayıb.</p>
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
                  <th>Əməliyyat</th>
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
                    <td>
                      <PayButton
                        ownerId={owner.id}
                        propertyId={a.id}
                        propertyType="Apartment"
                        balance={propertyBalances[a.id] ?? 0}
                        onPaid={reloadAll}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="owner-fluid-row">
        <section className="panel-card owner-section-card">
          <h4>
            <span className="panel-card-icon owner-section-icon">▭</span>
            Qarajlar
          </h4>
          {owner.garages.length === 0 ? (
            <p className="panel-page-lead">Bu sahibin adına heç bir qaraj qeydə alınmayıb.</p>
          ) : (
            <div className="owner-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nömrə</th>
                    <th>Növ</th>
                    <th>Qeyd</th>
                    <th>Balans</th>
                    <th>Əməliyyat</th>
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
                      <td>
                        <PayButton
                          ownerId={owner.id}
                          propertyId={g.id}
                          propertyType="Garage"
                          balance={propertyBalances[g.id] ?? 0}
                          onPaid={reloadAll}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      <ChargesTable accessToken={auth.accessToken} charges={charges} propertyLabels={propertyLabels} />

      <PaymentsTable
        accessToken={auth.accessToken}
        payments={payments}
        propertyLabels={propertyLabels}
      />

      {showLink && (
        <LinkToUserModal
          ownerId={owner.id}
          onClose={() => setShowLink(false)}
          onSaved={() => {
            setShowLink(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function LinkToUserModal({
  ownerId,
  onClose,
  onSaved,
}: {
  ownerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await linkOwnerToUser(accessToken, ownerId, user.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Hesaba bağla" onClose={onClose}>
      <p className="panel-page-lead">
        Bu passiv sahibi mövcud bir istifadəçi hesabına bağlayın ki, o özü sistemə daxil ola bilsin.
        Bağladıqdan sonra həmin istifadəçiyə &quot;ApartmentOwner&quot; rolunu ayrıca İdentifikasiya →
        Rollar bölməsindən verməyi unutmayın.
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <UserPicker selected={user} onSelect={setUser} />
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={!user || saving}>
            {saving ? "Saxlanılır…" : "Bağla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
