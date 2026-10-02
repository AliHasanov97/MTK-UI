"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything, useCanPay } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { formatDateTime } from "../../../lib/format";
import {
  VENDOR_TYPE_LABELS,
  getVendor,
  vendorTypeFromOrdinal,
  type VendorResponse,
} from "../../../lib/api/vendors";
import {
  VENDOR_CHARGE_STATUS_LABELS,
  cancelVendorCharge,
  createVendorPayment,
  getChargesByVendor,
  vendorChargeStatusFromOrdinal,
  type VendorChargeResponse,
} from "../../../lib/api/vendorCharges";
import { getPaymentsByVendor, type PaymentResponse } from "../../../lib/api/payments";
import { PaymentsTable, lastPaymentDate } from "../../binalar/finance";
import { Modal } from "../../Modal";

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;
const dateOnly = (iso: string) => iso.slice(0, 10);

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    if (err.status === 404) {
      return "Tədarükçü tapılmadı.";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function VendorDetailView({ vendorId }: { vendorId: string }) {
  const auth = useAuth();
  const canMakePayments = useCanPay();
  const canManage = useCanDoEverything();
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charges, setCharges] = useState<VendorChargeResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payCharge, setPayCharge] = useState<VendorChargeResponse | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getVendor(auth.accessToken, vendorId)
      .then((res) => {
        setVendor(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadFinance = useCallback(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([getChargesByVendor(auth.accessToken, vendorId), getPaymentsByVendor(auth.accessToken, vendorId)])
      .then(([chargeList, paymentList]) => {
        setCharges(chargeList);
        setPayments(paymentList);
      })
      .catch(() => {
        // Surfaced via the empty tables; the page's primary error state is the vendor fetch above.
      });
  }, [auth, vendorId]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

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

  if (!vendor) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  const sortedCharges = [...charges].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const openCharges = charges.filter((c) => {
    const status = vendorChargeStatusFromOrdinal(c.status);
    return status !== "Paid" && status !== "Cancelled";
  });
  const totalOpen = openCharges.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const overdue = openCharges.filter((c) => c.isOverdue);
  const totalOverdue = overdue.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const lastPayment = lastPaymentDate(payments);

  async function handleCancel(charge: VendorChargeResponse) {
    if (!window.confirm(`"${charge.description}" borcu ləğv edilsin?`)) return;
    setWorkingId(charge.id);
    setError(null);
    try {
      await cancelVendorCharge(accessToken, charge.id);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="owner-dashboard">
      <Link className="owner-back-link" href="/panel/tedarukculer">
        ← Tədarükçülərə qayıt
      </Link>

      <div className="owner-hero">
        <div className="owner-hero-top">
          <div className="owner-avatar">{initials(vendor.name)}</div>
          <div className="owner-hero-body">
            <h2>{vendor.name}</h2>
            <div className="owner-hero-meta">
              <span>{VENDOR_TYPE_LABELS[vendorTypeFromOrdinal(vendor.vendorType)]}</span>
              {vendor.voen && <span>VÖEN: {vendor.voen}</span>}
              {vendor.director && <span>{vendor.director}</span>}
              {vendor.phone && <span>{vendor.phone}</span>}
              {vendor.email && <span>{vendor.email}</span>}
            </div>
          </div>
          {canMakePayments && (
            <button
              type="button"
              className="panel-btn panel-btn-sm panel-btn-primary"
              disabled={totalOpen <= 0.005}
              onClick={() => setPayOpen(true)}
            >
              Ödəniş et
            </button>
          )}
          <span className={`vendor-status ${vendor.isActive ? "vendor-status-active" : "vendor-status-suspended"}`}>
            {vendor.isActive ? "Aktiv" : "Dayandırılıb"}
          </span>
        </div>
        <div className="owner-hero-stats">
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Açıq borc</span>
            <strong className={totalOpen > 0.005 ? "owner-balance-tag-debt" : ""}>{formatMoney(totalOpen)}</strong>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Gecikmiş</span>
            <strong className={totalOverdue > 0.005 ? "owner-balance-tag-debt" : ""}>
              {formatMoney(totalOverdue)}
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
          <span className="panel-card-icon owner-section-icon">₼</span>
          Borclar
        </h4>
        {sortedCharges.length === 0 ? (
          <p className="panel-page-lead">Hələ heç bir borc yaranmayıb.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Təsvir</th>
                  <th>Dövr</th>
                  <th>Məbləğ (₼)</th>
                  <th>Ödənilib (₼)</th>
                  <th>Qalıq (₼)</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedCharges.map((c) => {
                  const status = vendorChargeStatusFromOrdinal(c.status);
                  const canPay = status === "Unpaid" || status === "PartiallyPaid";
                  return (
                    <tr key={c.id}>
                      <td>
                        {c.description}
                        {c.isOverdue && (
                          <span className="vendor-cell-sub vendor-value-danger">
                            Son tarix {dateOnly(c.dueDate!)} — gecikib
                          </span>
                        )}
                      </td>
                      <td>{c.period ?? "—"}</td>
                      <td>{c.amount.toFixed(2)}</td>
                      <td className={c.paidAmount > 0.005 ? "owner-balance-tag-credit" : undefined}>
                        {c.paidAmount.toFixed(2)}
                      </td>
                      <td className={c.outstandingAmount > 0.005 ? "owner-balance-tag-debt" : undefined}>
                        {c.outstandingAmount.toFixed(2)}
                      </td>
                      <td>
                        <span className={`vendor-status vendor-status-${status.toLowerCase()}`}>
                          {VENDOR_CHARGE_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td>
                        <div className="data-table-actions">
                          {canMakePayments && canPay && (
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm panel-btn-primary"
                              disabled={workingId === c.id}
                              onClick={() => setPayCharge(c)}
                            >
                              Ödə
                            </button>
                          )}
                          {canManage && status !== "Paid" && status !== "Cancelled" && (
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm panel-btn-danger"
                              disabled={workingId === c.id}
                              onClick={() => handleCancel(c)}
                            >
                              Ləğv et
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentsTable accessToken={accessToken} payments={payments} />

      {payOpen && (
        <PayVendorModal
          vendorId={vendor.id}
          suggestedAmount={totalOpen}
          onClose={() => setPayOpen(false)}
          onSaved={() => {
            setPayOpen(false);
            reload();
          }}
        />
      )}
      {payCharge && (
        <PayVendorModal
          vendorId={vendor.id}
          description={payCharge.description ?? undefined}
          suggestedAmount={payCharge.outstandingAmount}
          onClose={() => setPayCharge(null)}
          onSaved={() => {
            setPayCharge(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function PayVendorModal({
  vendorId,
  description,
  suggestedAmount,
  onClose,
  onSaved,
}: {
  vendorId: string;
  /** Set when paying one specific charge — shown as context in the modal. */
  description?: string;
  suggestedAmount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [amount, setAmount] = useState(String(suggestedAmount.toFixed(2)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError("Ödəniş məbləği müsbət olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createVendorPayment(accessToken, {
        vendorId,
        amount: value,
        paymentMethod: "Cash",
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Tədarükçüyə ödəniş" onClose={onClose}>
      <p className="panel-page-lead">
        {description ? (
          <>
            {description} · qalıq borc <strong>{suggestedAmount.toFixed(2)} ₼</strong>
          </>
        ) : (
          <>
            Ümumi açıq borc <strong>{suggestedAmount.toFixed(2)} ₼</strong> — ödəniş açıq borclara ən köhnədən
            avtomatik tətbiq olunacaq.
          </>
        )}
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="vpay-amount">Məbləğ (₼)</label>
          <input
            id="vpay-amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Ödənilir…" : "Ödə"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
