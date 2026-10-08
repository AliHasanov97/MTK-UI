"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "../../../../lib/api/client";
import {
  cancelPurchase,
  getPurchase,
  purchaseStatusLabel,
  receivePurchase,
  type PurchaseResponse,
} from "../../../../lib/api/purchases-client";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { hasAnyRole, ROLES } from "../../../../lib/auth/roleConstants";
import { dateOnly } from "../../../../lib/format";
import { SignedDocumentsPanel } from "../../../SignedDocuments";
import { CreatePurchaseModal } from "../CreatePurchaseModal";

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Satınalma tapılmadı.";
    if (error.status === 401 || error.status === 403) return "Bu əməliyyata baxmaq üçün icazəniz yoxdur.";
    return `Məlumat yüklənmədi (${error.status}): ${error.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const money = (amount: number) =>
  `${amount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

export function SalinmaDetailView({ purchaseId }: { purchaseId: string }) {
  const auth = useAuth();
  const [purchase, setPurchase] = useState<PurchaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getPurchase(auth.accessToken, purchaseId)
      .then((result) => {
        setPurchase(result);
        setError(null);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [auth, purchaseId]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;
  const canReceive = hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER]);
  const canUploadDocuments = hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]);

  async function handleReceive() {
    setReceiving(true);
    setError(null);
    setNotice(null);
    try {
      await receivePurchase(accessToken, purchaseId);
      const updatedPurchase = await getPurchase(accessToken, purchaseId);
      setPurchase(updatedPurchase);
      setNotice("Satınalma qəbul edildi və anbara göndərildi.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReceiving(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Hazırlanan satınalma ləğv edilsin?")) return;
    setCancelling(true);
    setError(null);
    setNotice(null);
    try {
      await cancelPurchase(accessToken, purchaseId);
      setPurchase(await getPurchase(accessToken, purchaseId));
      setNotice("Satınalma ləğv edildi.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  async function reloadPurchase() {
    const updatedPurchase = await getPurchase(accessToken, purchaseId);
    setPurchase(updatedPurchase);
  }

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Satınalma məlumatı alınmadı</h2>
        <p>{error}</p>
        <Link className="panel-btn" href="/panel/maliyye-emeliyyatlari/salinmalar">Siyahıya qayıt</Link>
      </div>
    );
  }
  if (!purchase) return <p className="panel-page-lead">Satınalma məlumatı yüklənir…</p>;

  return (
    <div className="purchase-detail">
      {notice && <p className="ledger-alert" role="status">{notice}</p>}
      {canReceive && purchase.status === 0 && (
        <div className="form-actions purchase-receive-actions">
          <button
            type="button"
            className="panel-btn"
            onClick={() => setEditOpen(true)}
            disabled={receiving || cancelling}
          >
            Redaktə et
          </button>
          <button
            type="button"
            className="panel-btn panel-btn-danger"
            onClick={handleCancel}
            disabled={receiving || cancelling}
          >
            {cancelling ? "Ləğv edilir…" : "Satınalmanı ləğv et"}
          </button>
          <button
            type="button"
            className="panel-btn panel-btn-primary"
            onClick={handleReceive}
            disabled={receiving || !purchase.lines?.length}
          >
            {receiving ? "Qəbul edilir…" : "Qəbul et və anbara göndər"}
          </button>
        </div>
      )}
      <div className="purchase-detail-grid">
        <section className="data-table-wrap purchase-detail-card">
          <h2>Ümumi məlumat</h2>
          <dl className="purchase-meta">
            <div><dt>Qaimə nömrəsi</dt><dd>{purchase.invoiceNumber || "—"}</dd></div>
            <div><dt>Tədarükçü</dt><dd>{purchase.vendorName || "—"}</dd></div>
            <div><dt>Satınalma tarixi</dt><dd>{dateOnly(purchase.purchaseDate)}</dd></div>
            <div><dt>Qəbul tarixi</dt><dd>{dateOnly(purchase.receivedOnUtc)}</dd></div>
            <div><dt>Status</dt><dd>{purchaseStatusLabel(purchase.status)}</dd></div>
            <div><dt>Qeyd</dt><dd>{purchase.note || "—"}</dd></div>
          </dl>
        </section>

        <section className="data-table-wrap purchase-detail-card">
          <h2>Yekun məbləğ</h2>
          <p className="purchase-total">{money(purchase.totalAmount)}</p>
        </section>
      </div>

      <section className="data-table-wrap purchase-lines">
        <h2>Satınalma sətirləri</h2>
        {!purchase.lines?.length ? (
          <p className="panel-page-lead">Bu satınalma üçün sətir məlumatı yoxdur.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Material / xidmət</th><th>Miqdar</th><th>Vahid qiymət</th><th>Məbləğ</th></tr>
              </thead>
              <tbody>
                {purchase.lines.map((line, index) => (
                  <tr key={line.id || `${line.nomenclatureId}-${index}`}>
                    <td>{line.nomenclatureName ?? "—"}{line.nomenclatureCode ? <span className="vendor-cell-sub">{line.nomenclatureCode}</span> : null}</td>
                    <td>{line.quantity}</td>
                    <td>{money(line.unitPrice)}</td>
                    <td>{money(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="data-table-wrap purchase-detail-card">
        <SignedDocumentsPanel
          accessToken={accessToken}
          target={{ purchaseId }}
          canUpload={canUploadDocuments}
        />
      </section>
      {editOpen && (
        <CreatePurchaseModal
          purchase={purchase}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            setNotice("Satınalma məlumatları yeniləndi.");
            void reloadPurchase();
          }}
        />
      )}
    </div>
  );
}
