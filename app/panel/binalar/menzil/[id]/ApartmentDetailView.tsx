"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { useCanDoEverything, useMyOwnerId } from "../../../../lib/auth/roles";
import { ApiError } from "../../../../lib/api/client";
import { formatDateTime } from "../../../../lib/format";
import {
  assignOwnerToApartment,
  getApartmentById,
  getOwnershipHistory,
  transferApartmentOwnership,
  type Apartment,
  type OwnershipHistoryDto,
} from "../../../../lib/api/buildings";
import type { OwnerListItem } from "../../../../lib/api/owners";
import { Modal } from "../../../Modal";
import { OwnerPicker } from "../../OwnerPicker";
import { useCreatedBy, useCreatedByMap } from "../../auditHooks";
import {
  ChargesTable,
  PayButton,
  formatSigned,
  lastPaymentDate,
  usePropertyDebtGate,
  usePropertyFinance,
} from "../../finance";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    if (err.status === 404) {
      return "Mənzil tapılmadı.";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function ApartmentDetailView({ apartmentId }: { apartmentId: string }) {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const { ownerId: myOwnerId, loading: myOwnerLoading } = useMyOwnerId(canManage);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [ownershipHistory, setOwnershipHistory] = useState<OwnershipHistoryDto[]>([]);
  const createdBy = useCreatedBy(auth.status === "authenticated" ? auth.accessToken : "", "Apartment", apartmentId);
  const transferCreators = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "OwnershipHistory");

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getApartmentById(auth.accessToken, apartmentId)
      .then((res) => {
        setApartment(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, apartmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadOwnershipHistory = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getOwnershipHistory(auth.accessToken, apartmentId)
      .then((res) => setOwnershipHistory(res))
      .catch(() => {
        // Surfaced via the empty-state message; not worth a page-level error.
      });
  }, [auth, apartmentId]);

  useEffect(() => {
    loadOwnershipHistory();
  }, [loadOwnershipHistory]);

  const { charges, payments, balance, reload: reloadFinance } = usePropertyFinance(
    auth.status === "authenticated" ? auth.accessToken : undefined,
    apartment?.currentOwner?.id,
    apartmentId,
  );

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!apartment) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  // Komandant/admin hər mənzilə baxa bilər. Sakin isə yalnız ÖZ mənzilinə —
  // başqasının id-sini URL-ə yazıb girməyə çalışsa, burada bloklanır.
  if (!canManage) {
    if (myOwnerLoading) {
      return <p className="panel-page-lead">Yüklənir…</p>;
    }
    if (!apartment.currentOwner || apartment.currentOwner.id !== myOwnerId) {
      return (
        <div className="panel-denied">
          <h2>İcazəniz yoxdur</h2>
          <p>Bu mənzil sizin adınıza qeydə alınmayıb.</p>
        </div>
      );
    }
  }

  return (
    <div className="owner-dashboard">
      <Link className="owner-back-link" href={canManage ? "/panel/binalar" : "/panel/profil"}>
        ← {canManage ? "Mənzillərə qayıt" : "Profilimə qayıt"}
      </Link>

      <div className="owner-hero">
        <div className="owner-hero-top">
          <div className="owner-avatar">⌂</div>
          <div className="owner-hero-body">
            <h2>
              {apartment.building.name} — Mənzil {apartment.apartmentNumber}
            </h2>
            <div className="owner-hero-meta">
              <span>{apartment.floor}-cü mərtəbə</span>
              <span>{apartment.roomCount} otaqlı</span>
              <span>{apartment.areaSquareMeters} m²</span>
              {createdBy && <span>Əməliyyatı icra etdi: {createdBy}</span>}
            </div>
          </div>
          <span className="panel-role-tag">{apartment.status}</span>
        </div>
        <div className="owner-hero-stats">
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Balans</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <strong className={balance < 0 ? "owner-balance-tag-debt" : balance > 0 ? "owner-balance-tag-credit" : ""}>
                {formatSigned(balance)}
              </strong>
              {apartment.currentOwner && (
                <PayButton
                  ownerId={apartment.currentOwner.id}
                  propertyId={apartment.id}
                  propertyType="Apartment"
                  balance={balance}
                  onPaid={reloadFinance}
                />
              )}
            </div>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Son ödəniş</span>
            <strong>{formatDateTime(lastPaymentDate(payments))}</strong>
          </div>
        </div>
      </div>

      <section className="panel-card owner-section-card">
        <h4>
          <span className="panel-card-icon owner-section-icon">◐</span>
          Sahibi
        </h4>
        {apartment.currentOwner ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Link className="owner-link" href={`/panel/binalar/sahibler/${apartment.currentOwner.id}`}>
              {apartment.currentOwner.name}
            </Link>
            {canManage && (
              <button type="button" className="panel-btn panel-btn-sm" onClick={() => setShowTransfer(true)}>
                Mülkiyyəti köçür
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <p className="panel-page-lead" style={{ margin: 0 }}>
              Bu mənzilin hazırda sahibi yoxdur (boş).
            </p>
            {canManage && (
              <button
                type="button"
                className="panel-btn panel-btn-sm panel-btn-primary"
                onClick={() => setShowAssign(true)}
              >
                Sahib təyin et
              </button>
            )}
          </div>
        )}
      </section>

      <section className="panel-card owner-section-card">
        <h4>
          <span className="panel-card-icon owner-section-icon">⇄</span>
          Mülkiyyət tarixçəsi
        </h4>
        {ownershipHistory.length === 0 ? (
          <p className="panel-page-lead">Hələ mülkiyyət köçürülməsi qeydə alınmayıb.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Əvvəlki sahib</th>
                  <th>Yeni sahib</th>
                  <th>Əməliyyatı icra etdi</th>
                </tr>
              </thead>
              <tbody>
                {ownershipHistory.map((h) => (
                  <tr key={h.id}>
                    <td>{formatDateTime(h.transferDate)}</td>
                    <td>{h.previousOwnerName ?? "—"}</td>
                    <td>{h.newOwnerName}</td>
                    <td>{transferCreators[h.id] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ChargesTable accessToken={auth.accessToken} charges={charges} title="Borclar və ödənişlər" />

      {showAssign && (
        <AssignOwnerModal
          apartmentId={apartment.id}
          onClose={() => setShowAssign(false)}
          onSaved={() => {
            setShowAssign(false);
            load();
          }}
        />
      )}

      {showTransfer && (
        <TransferOwnershipModal
          apartmentId={apartment.id}
          onClose={() => setShowTransfer(false)}
          onSaved={() => {
            setShowTransfer(false);
            load();
            loadOwnershipHistory();
          }}
        />
      )}
    </div>
  );
}

function AssignOwnerModal({
  apartmentId,
  onClose,
  onSaved,
}: {
  apartmentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [owner, setOwner] = useState<OwnerListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!owner) return;
    setSaving(true);
    setError(null);
    try {
      await assignOwnerToApartment(accessToken, apartmentId, owner.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Sahib təyin et" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <OwnerPicker selected={owner} onSelect={setOwner} />
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={!owner || saving}>
            {saving ? "Saxlanılır…" : "Təyin et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransferOwnershipModal({
  apartmentId,
  onClose,
  onSaved,
}: {
  apartmentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [owner, setOwner] = useState<OwnerListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  // Transfer bundan əvvəl: əmlakın borcu API-dan yoxlanır — borcu olan mənzil
  // köçürülə bilməz.
  const debtGate = usePropertyDebtGate(accessToken, apartmentId, true);
  if (debtGate.checking) {
    return (
      <Modal title="Mülkiyyəti köçür" onClose={onClose}>
        <p className="panel-page-lead">Borc yoxlanılır…</p>
      </Modal>
   );
  }
  if (debtGate.error) {
    return (
      <Modal title="Mülkiyyəti köçür" onClose={onClose}>
        <p className="form-error">Borc yoxlanıla bilmədi: {debtGate.error}</p>
        <div className="form-actions">
          <button type="button" className="panel-btn panel-btn-primary" onClick={debtGate.checkDebt}>
            Yenidən cəhd et
          </button>
        </div>
      </Modal>
   );
  }
  if (debtGate.debt !== null && debtGate.debt > 0.005) {
    return (
      <Modal title="Mülkiyyəti köçür" onClose={onClose}>
        <p className="form-error">
          Bu mənzil üzrə <strong>{debtGate.debt.toFixed(2)} ₼</strong> qalıq borc var. Əvvəlcə borcu
          ödənilməlidir — borcu olan mənzil köçürülə bilməz.
        </p>
        <div className="form-actions">
          <button type="button" className="panel-btn panel-btn-primary" onClick={onClose}>
            Bağla
          </button>
        </div>
      </Modal>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!owner) return;
    setSaving(true);
    setError(null);
    try {
      // Göndərmə anında təkrar yoxla — modal açıldıqdan sonra yaranmış borcu da tutur.
      const debt = await debtGate.checkDebt();
      if (debt === null) {
        setError("Borc yoxlanıla bilmədi, əməliyyat dayandırıldı.");
        return;
      }
      if (debt > 0.005) {
        setError(`Bu mənzil üzrə ${debt.toFixed(2)} ₼ qalıq borc var — köçürmə mümkün deyil.`);
        return;
      }
      await transferApartmentOwnership(accessToken, apartmentId, {
        newOwnerId: owner.id,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Mülkiyyəti köçür" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <OwnerPicker selected={owner} onSelect={setOwner} label="Yeni sahib" />
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={!owner || saving}>
            {saving ? "Saxlanılır…" : "Köçür"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
