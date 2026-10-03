"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { useCanDoEverything, useMyOwnerId } from "../../../../lib/auth/roles";
import { ApiError } from "../../../../lib/api/client";
import { formatDateTime } from "../../../../lib/format";
import {
  GARAGE_TYPE_LABELS,
  assignOwnerToGarage,
  deleteGarage,
  getGarageById,
  removeOwnerFromGarage,
  updateGarage,
  type Garage,
  type GarageTypeKey,
} from "../../../../lib/api/garages";
import { getPropertyBalance } from "../../../../lib/api/payments";
import type { OwnerListItem } from "../../../../lib/api/owners";
import { Modal } from "../../../Modal";
import { OwnerPicker } from "../../OwnerPicker";
import { useCreatedBy } from "../../auditHooks";
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
      return "Qaraj tapılmadı.";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function GarageDetailView({ garageId }: { garageId: string }) {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const { ownerId: myOwnerId, loading: myOwnerLoading } = useMyOwnerId(canManage);
  const router = useRouter();
  const [garage, setGarage] = useState<Garage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const createdBy = useCreatedBy(auth.status === "authenticated" ? auth.accessToken : "", "Garage", garageId);

  // "Sahibi çıxar" təsdiq pəncərəsi açılanda əmlakın borcu API-dan çəkilir —
  // borc varsa təsdiq düyməsi bloklanır və səbəb göstərilir.
  const debtGate = usePropertyDebtGate(
    auth.status === "authenticated" ? auth.accessToken : undefined,
    garageId,
    showRemoveConfirm,
  );

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getGarageById(auth.accessToken, garageId)
      .then((res) => {
        setGarage(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, garageId]);

  useEffect(() => {
    load();
  }, [load]);

  const { charges, payments, balance, reload: reloadFinance } = usePropertyFinance(
    auth.status === "authenticated" ? auth.accessToken : undefined,
    garage?.owner?.id,
    garageId,
  );

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!garage) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  async function handleRemoveOwner() {
    setWorking(true);
    setActionError(null);
    try {
      // Sahiblikdən çıxarmadan əvvəl: əmlakın borcu API-dan yoxlanır — borcu
      // olan qarajın sahibi çıxarıla bilməz.
      const balance = await getPropertyBalance(accessToken, garageId);
      const debt = Math.max(0, -balance.currentBalance);
      if (debt > 0.005) {
        setActionError(
          `Bu qaraj üzrə ${debt.toFixed(2)} ₼ qalıq borc var. Əvvəlcə borcu ödənilməlidir — borcu olan qarajın sahibi çıxarıla bilməz.`,
        );
        return;
      }
      await removeOwnerFromGarage(accessToken, garageId);
      setShowRemoveConfirm(false);
      load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete() {
    setWorking(true);
    setActionError(null);
    try {
      await deleteGarage(accessToken, garageId);
      router.push("/panel/binalar/qarajlar");
    } catch (err) {
      setActionError(errorMessage(err));
      setWorking(false);
    }
  }

  // Komandant/admin hər qaraja baxa bilər. Sakin isə yalnız ÖZ qarajına —
  // başqasının id-sini URL-ə yazıb girməyə çalışsa, burada bloklanır.
  if (!canManage) {
    if (myOwnerLoading) {
      return <p className="panel-page-lead">Yüklənir…</p>;
    }
    if (!garage.owner || garage.owner.id !== myOwnerId) {
      return (
        <div className="panel-denied">
          <h2>İcazəniz yoxdur</h2>
          <p>Bu qaraj sizin adınıza qeydə alınmayıb.</p>
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
          <div className="owner-avatar">▭</div>
          <div className="owner-hero-body">
            <h2>Qaraj {garage.garageNumber}</h2>
            <div className="owner-hero-meta">
              <span>{GARAGE_TYPE_LABELS[garage.type as GarageTypeKey] ?? garage.type}</span>
              {garage.description && <span>{garage.description}</span>}
              {createdBy && <span>Əməliyyatı icra etdi: {createdBy}</span>}
            </div>
          </div>
          {canManage && (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="panel-btn panel-btn-sm" onClick={() => setShowEdit(true)}>
                Redaktə et
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-sm panel-btn-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Sil
              </button>
            </div>
          )}
        </div>
        <div className="owner-hero-stats">
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Balans</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <strong className={balance < 0 ? "owner-balance-tag-debt" : balance > 0 ? "owner-balance-tag-credit" : ""}>
                {formatSigned(balance)}
              </strong>
              {garage.owner && (
                <PayButton
                  ownerId={garage.owner.id}
                  propertyId={garage.id}
                  propertyType="Garage"
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
        {actionError && <p className="form-error">{actionError}</p>}
        {garage.owner ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Link className="owner-link" href={`/panel/binalar/sahibler/${garage.owner.id}`}>
              {garage.owner.name}
            </Link>
            {canManage && (
              <button
                type="button"
                className="panel-btn panel-btn-sm panel-btn-danger"
                onClick={() => setShowRemoveConfirm(true)}
              >
                Sahibi çıxar
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <p className="panel-page-lead" style={{ margin: 0 }}>
              Bu qarajın hazırda sahibi yoxdur (boş).
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

      <ChargesTable accessToken={accessToken} charges={charges} title="Borclar və ödənişlər" />

      {showEdit && (
        <EditGarageModal
          garage={garage}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}

      {showAssign && (
        <AssignOwnerModal
          garageId={garage.id}
          onClose={() => setShowAssign(false)}
          onSaved={() => {
            setShowAssign(false);
            load();
          }}
        />
      )}

      {showRemoveConfirm && (
        <Modal title="Sahibi çıxar" onClose={() => setShowRemoveConfirm(false)}>
          <p className="panel-page-lead">
            <strong>{garage.owner?.name}</strong> bu qarajın sahibliyindən çıxarılsın?
          </p>
          {debtGate.checking && <p className="panel-page-lead">Borc yoxlanılır…</p>}
          {debtGate.error && (
            <p className="form-error">Borc yoxlanıla bilmədi: {debtGate.error}</p>
          )}
          {debtGate.debt !== null && debtGate.debt > 0.005 && (
            <p className="form-error">
              Bu qaraj üzrə <strong>{debtGate.debt.toFixed(2)} ₼</strong> qalıq borc var. Əvvəlcə borcu
              ödənilməlidir — borcu olan qarajın sahibi çıxarıla bilməz.
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={() => setShowRemoveConfirm(false)}>
              Ləğv et
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-danger"
              onClick={handleRemoveOwner}
              disabled={working || debtGate.blocked}
            >
              {working ? "Yerinə yetirilir…" : "Çıxar"}
            </button>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal title="Qarajı sil" onClose={() => setShowDeleteConfirm(false)}>
          <p className="panel-page-lead">
            <strong>Qaraj {garage.garageNumber}</strong> silinsin? Bu əməliyyat geri qaytarıla bilməz.
          </p>
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={() => setShowDeleteConfirm(false)}>
              Ləğv et
            </button>
            <button type="button" className="panel-btn panel-btn-danger" onClick={handleDelete} disabled={working}>
              {working ? "Silinir…" : "Sil"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EditGarageModal({
  garage,
  onClose,
  onSaved,
}: {
  garage: Garage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [type, setType] = useState<GarageTypeKey>((garage.type as GarageTypeKey) ?? "OpenParking");
  const [description, setDescription] = useState(garage.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateGarage(accessToken, garage.id, { type, description: description || null });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Qaraj ${garage.garageNumber} — redaktə`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="edit-garage-type">Növ</label>
          <select id="edit-garage-type" value={type} onChange={(e) => setType(e.target.value as GarageTypeKey)}>
            {(Object.keys(GARAGE_TYPE_LABELS) as GarageTypeKey[]).map((key) => (
              <option key={key} value={key}>
                {GARAGE_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="edit-garage-description">Qeyd</label>
          <input
            id="edit-garage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Saxla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssignOwnerModal({
  garageId,
  onClose,
  onSaved,
}: {
  garageId: string;
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
      await assignOwnerToGarage(accessToken, garageId, owner.id);
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
