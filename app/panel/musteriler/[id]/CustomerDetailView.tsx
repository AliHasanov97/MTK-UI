"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything, useCanPay } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { formatDateTime } from "../../../lib/format";
import { QueryComparisonType } from "../../../lib/api/buildings";
import {
  CONTRACT_STATUS_LABELS,
  contractStatusFromOrdinal,
  searchContracts,
  type ContractListItem,
} from "../../../lib/api/contracts";
import {
  CUSTOMER_TYPE_LABELS,
  customerTypeFromOrdinal,
  getCustomer,
  getCustomerBalance,
  type CustomerBalanceResponse,
  type CustomerResponse,
} from "../../../lib/api/customers";
import {
  cancelCustomerCharge,
  getChargesByCustomer,
  getPaymentsByCustomer,
  type CustomerChargeResponse,
} from "../../../lib/api/customerCharges";
import { VENDOR_CHARGE_STATUS_LABELS, vendorChargeStatusFromOrdinal } from "../../../lib/api/vendorCharges";
import type { PaymentResponse } from "../../../lib/api/payments";
import { PaymentsTable, lastPaymentDate, useCreatedBy } from "../../binalar/finance";
import { CreateChargeModal, ReceivePaymentModal } from "../MusterilerView";
import { useConfirm } from "../../../components/ConfirmDialog";

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;
const dateOnly = (iso: string) => iso.slice(0, 10);

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    if (err.status === 404) {
      return "Müştəri tapılmadı.";
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

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const auth = useAuth();
  const confirm = useConfirm();
  const canMakePayments = useCanPay();
  const canManage = useCanDoEverything();
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charges, setCharges] = useState<CustomerChargeResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [balance, setBalance] = useState<CustomerBalanceResponse | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const createdBy = useCreatedBy(auth.status === "authenticated" ? auth.accessToken : "", "Customer", customerId);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getCustomer(auth.accessToken, customerId)
      .then((res) => {
        setCustomer(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRelated = useCallback(() => {
    if (auth.status !== "authenticated") return;
    const token = auth.accessToken;

    // Hər bölmə ayrıca yüklənir: biri uğursuz olsa digərləri yenə də görünür, xəta isə gizlədilmir.
    Promise.allSettled([
      getChargesByCustomer(token, customerId),
      getPaymentsByCustomer(token, customerId),
      getCustomerBalance(token, customerId),
      searchContracts(token, {
        filters: [{ columnName: "customerId", comparison: QueryComparisonType.Equals, value: customerId }],
        pageSize: 100,
      }),
    ]).then(([chargeRes, paymentRes, balanceRes, contractRes]) => {
      const failures: string[] = [];

      if (chargeRes.status === "fulfilled") setCharges(chargeRes.value);
      else failures.push(`Borclar: ${errorMessage(chargeRes.reason)}`);

      if (paymentRes.status === "fulfilled") setPayments(paymentRes.value);
      else failures.push(`Ödənişlər: ${errorMessage(paymentRes.reason)}`);

      if (balanceRes.status === "fulfilled") setBalance(balanceRes.value);
      else failures.push(`Avans: ${errorMessage(balanceRes.reason)}`);

      if (contractRes.status === "fulfilled") setContracts(contractRes.value.contracts);
      else failures.push(`Müqavilələr: ${errorMessage(contractRes.reason)}`);

      setRelatedError(failures.length > 0 ? failures.join(" · ") : null);
    });
  }, [auth, customerId]);

  useEffect(() => {
    loadRelated();
  }, [loadRelated, reloadKey]);

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

  if (!customer) {
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

  async function handleCancel(charge: CustomerChargeResponse) {
    if (!(await confirm(`"${charge.description}" borcu ləğv edilsin?`))) return;
    setWorkingId(charge.id);
    setError(null);
    try {
      await cancelCustomerCharge(accessToken, charge.id);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="owner-dashboard">
      <Link className="owner-back-link" href="/panel/musteriler">
        ← Müştərilərə qayıt
      </Link>

      {relatedError && (
        <p className="ledger-alert" role="alert">
          {relatedError}
        </p>
      )}

      <div className="owner-hero">
        <div className="owner-hero-top">
          <div className="owner-avatar">{initials(customer.name)}</div>
          <div className="owner-hero-body">
            <h2>{customer.name}</h2>
            <div className="owner-hero-meta">
              <span>{CUSTOMER_TYPE_LABELS[customerTypeFromOrdinal(customer.customerType)]}</span>
              {customer.voen && <span>VÖEN: {customer.voen}</span>}
              {customer.director && <span>{customer.director}</span>}
              {customer.phone && <span>{customer.phone}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.address && <span>{customer.address}</span>}
              {createdBy && <span>Əməliyyatı icra etdi: {createdBy}</span>}
            </div>
          </div>
          {canMakePayments && (
            <>
              <button type="button" className="panel-btn panel-btn-sm" onClick={() => setChargeOpen(true)}>
                + Borc yaz
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-sm panel-btn-primary"
                onClick={() => setPayOpen(true)}
              >
                Ödəniş qəbul et
              </button>
            </>
          )}
          <span className={`vendor-status ${customer.isActive ? "vendor-status-active" : "vendor-status-suspended"}`}>
            {customer.isActive ? "Aktiv" : "Dayandırılıb"}
          </span>
        </div>
        <div className="owner-hero-stats">
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Açıq borc</span>
            <strong className={totalOpen > 0.005 ? "owner-balance-tag-debt" : ""}>{formatMoney(totalOpen)}</strong>
          </div>
          <div className="owner-hero-stat">
            <span className="owner-stat-label">Avans</span>
            <strong className={(balance?.advance ?? 0) > 0.005 ? "owner-balance-tag-credit" : ""}>
              {formatMoney(balance?.advance ?? 0)}
            </strong>
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
          <span className="panel-card-icon owner-section-icon">§</span>
          Müqavilələr
        </h4>
        {contracts.length === 0 ? (
          <p className="panel-page-lead">Bu müştəri ilə hələ müqavilə bağlanmayıb.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nömrə</th>
                  <th>Müddət</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const status = contractStatusFromOrdinal(c.status);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link className="owner-link" href={`/panel/muqavileler/${c.id}`}>
                          {c.number}
                        </Link>
                      </td>
                      <td>
                        {dateOnly(c.startDate)} — {dateOnly(c.endDate)}
                      </td>
                      <td>
                        <span
                          className={`panel-role-tag${status === "Active" && !c.isExpired ? "" : " panel-role-tag-inactive"}`}
                        >
                          {CONTRACT_STATUS_LABELS[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                  const open = status === "Unpaid" || status === "PartiallyPaid";
                  return (
                    <tr key={c.id}>
                      <td>
                        {c.description}
                        {c.isOverdue && c.dueDate && (
                          <span className="vendor-cell-sub vendor-value-danger">
                            Son tarix {dateOnly(c.dueDate)} — gecikib
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
                        {canManage && open && (
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            disabled={workingId === c.id}
                            onClick={() => handleCancel(c)}
                          >
                            Ləğv et
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentsTable accessToken={accessToken} payments={payments} title="Daxil olan ödənişlər" />

      {chargeOpen && (
        <CreateChargeModal
          customerId={customer.id}
          onClose={() => setChargeOpen(false)}
          onSaved={() => {
            setChargeOpen(false);
            reload();
          }}
        />
      )}
      {payOpen && (
        <ReceivePaymentModal
          customer={{ id: customer.id, name: customer.name, outstanding: totalOpen }}
          onClose={() => setPayOpen(false)}
          onSaved={() => {
            setPayOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
