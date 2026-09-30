"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { ApiError } from "../../../../lib/api/client";
import {
  assignOwnerToApartment,
  getApartmentById,
  transferApartmentOwnership,
  type Apartment,
} from "../../../../lib/api/buildings";
import type { OwnerListItem } from "../../../../lib/api/owners";
import { Modal } from "../../../Modal";
import { OwnerPicker } from "../../OwnerPicker";
import {
  ChargesTable,
  PaymentsTable,
  PayButton,
  formatSigned,
  lastPaymentDate,
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
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

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

  return (
    <div className="owner-dashboard">
      <Link className="owner-back-link" href="/panel/binalar">
        ← Mənzillərə qayıt
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
            <strong>{lastPaymentDate(payments)?.slice(0, 10) ?? "—"}</strong>
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
            <button type="button" className="panel-btn panel-btn-sm" onClick={() => setShowTransfer(true)}>
              Mülkiyyəti köçür
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <p className="panel-page-lead" style={{ margin: 0 }}>
              Bu mənzilin hazırda sahibi yoxdur (boş).
            </p>
            <button
              type="button"
              className="panel-btn panel-btn-sm panel-btn-primary"
              onClick={() => setShowAssign(true)}
            >
              Sahib təyin et
            </button>
          </div>
        )}
      </section>

      <ChargesTable accessToken={auth.accessToken} charges={charges} />

      <PaymentsTable
        accessToken={auth.accessToken}
        payments={payments}
      />

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
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salePrice, setSalePrice] = useState("");
  const [notes, setNotes] = useState("");
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
      await transferApartmentOwnership(accessToken, apartmentId, {
        newOwnerId: owner.id,
        transferDate,
        salePrice: salePrice ? Number(salePrice) : null,
        notes: notes || null,
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
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="transfer-date">Transfer tarixi</label>
            <input
              id="transfer-date"
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="transfer-price">Satış qiyməti (₼)</label>
            <input
              id="transfer-price"
              type="number"
              min={0}
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="transfer-notes">Qeyd</label>
          <input id="transfer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
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
