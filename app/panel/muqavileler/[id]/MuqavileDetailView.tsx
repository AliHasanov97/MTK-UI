"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything, useCanPay } from "../../../lib/auth/roles";
import { ApiError, saveBlobAsFile } from "../../../lib/api/client";
import {
  BILLING_PERIODS_ORDERED,
  BILLING_PERIOD_LABELS,
  CONTRACT_STATUS_LABELS,
  activateContract,
  addContractService,
  billingPeriodFromOrdinal,
  contractStatusFromOrdinal,
  deleteContract,
  exportContract,
  getContract,
  removeContractService,
  setContractServiceStatus,
  suspendContract,
  terminateContract,
  updateContract,
  updateContractService,
  type BillingPeriodKey,
  type ContractResponse,
  type ContractServiceResponse,
} from "../../../lib/api/contracts";
import {
  VENDOR_CHARGE_STATUS_LABELS,
  cancelVendorCharge,
  createVendorPayment,
  searchVendorCharges,
  vendorChargeStatusFromOrdinal,
  type VendorChargeResponse,
} from "../../../lib/api/vendorCharges";
import { QueryComparisonType, type QueryFilter } from "../../../lib/api/buildings";
import { useCreatedBy, useCreatedByMap } from "../../binalar/finance";
import { Modal } from "../../Modal";
import { SignedDocumentsPanel } from "../../SignedDocuments";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const dateOnly = (iso: string) => iso.slice(0, 10);

export function MuqavileDetailView({ contractId }: { contractId: string }) {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const canMakePayments = useCanPay();
  const router = useRouter();
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serviceForm, setServiceForm] = useState<{ service: ContractServiceResponse | null } | null>(null);
  const [payForm, setPayForm] = useState<VendorChargeResponse | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [charges, setCharges] = useState<VendorChargeResponse[] | null>(null);
  const [chargesError, setChargesError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const createdBy = useCreatedBy(auth.status === "authenticated" ? auth.accessToken : "", "Contract", contractId);
  const serviceCreators = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "ContractService");

  const loadCharges = useCallback(() => {
    if (auth.status !== "authenticated") return;
    // Borclar müqavilə üzrə filtrlənir — QueryFilter "contractId equals" (ordinal 0).
    const filters: QueryFilter[] = [
      { columnName: "contractId", comparison: QueryComparisonType.Equals, value: contractId },
    ];
    searchVendorCharges(auth.accessToken, { filters, pageSize: 50 })
      .then((res) => {
        setCharges(res.items);
        setChargesError(null);
      })
      .catch((err) => setChargesError(errorMessage(err)));
  }, [auth, contractId]);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    getContract(auth.accessToken, contractId)
      .then((res) => {
        setContract(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, contractId]);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(() => {
    load();
    loadCharges();
  }, [load, loadCharges]);

  useEffect(() => {
    loadCharges();
  }, [loadCharges]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const { blob, fileName } = await exportContract(accessToken, contractId);
      saveBlobAsFile(blob, fileName);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  if (error && !contract) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
        <Link className="panel-btn" href="/panel/muqavileler">Müqavilələrə qayıt</Link>
      </div>
    );
  }

  if (!contract) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  const status = contractStatusFromOrdinal(contract.status);
  const isDraft = status === "Draft";
  const money = (n: number) => `${n.toFixed(2)} ₼`;

  return (
    <div className="purchase-detail">
      {error && <p className="form-error">{error}</p>}

      {canManage && (
        <div className="form-actions purchase-receive-actions">
          {status !== "Terminated" && (
            <button type="button" className="panel-btn" disabled={busy} onClick={() => setDatesOpen(true)}>
              Müddəti/qeydi dəyiş
            </button>
          )}
          {(status === "Draft" || status === "Suspended") && (
            <button
              type="button"
              className="panel-btn panel-btn-primary"
              disabled={busy}
              onClick={() => run(() => activateContract(accessToken, contract.id))}
            >
              Aktivləşdir
            </button>
          )}
          {status === "Active" && (
            <button
              type="button"
              className="panel-btn"
              disabled={busy}
              onClick={() => run(() => suspendContract(accessToken, contract.id, null))}
            >
              Dayandır
            </button>
          )}
          {status !== "Terminated" && (
            <button
              type="button"
              className="panel-btn panel-btn-danger"
              disabled={busy}
              onClick={() => setTerminateOpen(true)}
            >
              Ləğv et
            </button>
          )}
          {status !== "Active" && (
            <button
              type="button"
              className="panel-btn panel-btn-danger"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(`${contract.number} müqaviləsi silinsin?`)) return;
                setBusy(true);
                setError(null);
                try {
                  await deleteContract(accessToken, contract.id);
                  router.push("/panel/muqavileler");
                } catch (err) {
                  setError(errorMessage(err));
                  setBusy(false);
                }
              }}
            >
              Sil
            </button>
          )}
        </div>
      )}

      <div className="purchase-detail-grid">
        <section className="data-table-wrap purchase-detail-card">
          <h2>Ümumi məlumat</h2>
          <dl className="purchase-meta">
            <div><dt>Nömrə</dt><dd>{contract.number}</dd></div>
            <div><dt>Tədarükçü</dt><dd>{contract.vendorName ?? "Tədarükçü tapılmadı"}</dd></div>
            <div><dt>Müddət</dt><dd>{dateOnly(contract.startDate)} — {dateOnly(contract.endDate)}</dd></div>
            <div>
              <dt>Status</dt>
              <dd>
                <strong className={contract.isActive ? "owner-balance-tag-credit" : "owner-balance-tag-debt"}>
                  {CONTRACT_STATUS_LABELS[status]}
                </strong>
                {contract.isExpired && status === "Active" && (
                  <span className="panel-role-tag panel-role-tag-inactive" style={{ marginLeft: 6 }}>
                    müddəti bitib
                  </span>
                )}
              </dd>
            </div>
            <div className="transaction-document-description"><dt>Qeyd</dt><dd>{contract.note || "—"}</dd></div>
          </dl>
          {createdBy && <p className="panel-page-lead" style={{ margin: "14px 0 0" }}>Əməliyyatı icra etdi: <strong>{createdBy}</strong></p>}
        </section>

        <section className="data-table-wrap purchase-detail-card">
          <h2>Aylıq yük</h2>
          <p className="purchase-total">{money(contract.monthlyAmount)}</p>
          <dl className="purchase-meta" style={{ marginTop: 16 }}>
            <div><dt>Dövr üzrə cəm</dt><dd>{money(contract.totalAmount)}</dd></div>
            <div><dt>Xidmət sayı</dt><dd>{contract.services.length}</dd></div>
          </dl>
        </section>
      </div>

      <section className="data-table-wrap purchase-lines">
        <div className="transaction-document-heading">
          <h2>Müqavilə üzrə xidmətlər</h2>
          {canManage && isDraft && (
            <button
              type="button"
              className="panel-btn panel-btn-sm panel-btn-primary"
              onClick={() => setServiceForm({ service: null })}
            >
              + Xidmət əlavə et
            </button>
          )}
        </div>

        {contract.services.length === 0 ? (
          <p className="panel-page-lead">
            Hələ xidmət yoxdur. Müqavilə aktivləşməzdən əvvəl ən azı bir xidmət əlavə edilməlidir.
          </p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Xidmət</th>
                  <th>Növ</th>
                  <th>Qiymət</th>
                  <th>Status</th>
                  <th>Yaradan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contract.services.map((s) => {
                  const isOneTime = billingPeriodFromOrdinal(s.billingPeriod) === "OneTime";
                  return (
                  <tr key={s.id}>
                    <td>
                      {s.name}
                      {s.description && (
                        <span style={{ color: "#8a938c" }}> · {s.description}</span>
                      )}
                      {s.paymentTermDays != null && (
                        <span style={{ color: "#8a938c" }}> · ödəniş {s.paymentTermDays} gün</span>
                      )}
                    </td>
                    <td>{BILLING_PERIOD_LABELS[billingPeriodFromOrdinal(s.billingPeriod)]}</td>
                    <td>
                      {isOneTime && s.periodAmount <= 0 ? (
                        <span style={{ color: "#8a938c" }}>Təyin olunmayıb</span>
                      ) : (
                        <strong>{money(s.periodAmount)}</strong>
                      )}
                    </td>
                    <td>
                      <span className={`panel-role-tag${s.isActive ? "" : " panel-role-tag-inactive"}`}>
                        {s.isActive ? "Aktiv" : "Dayandırılıb"}
                      </span>
                    </td>
                    <td>{serviceCreators[s.id] ?? "—"}</td>
                    <td>
                      {canManage && (
                        <div className="data-table-actions">
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                className="panel-btn panel-btn-sm"
                                disabled={busy}
                                onClick={() => setServiceForm({ service: s })}
                              >
                                Redaktə
                              </button>
                              <button
                                type="button"
                                className="panel-btn panel-btn-sm panel-btn-danger"
                                disabled={busy}
                                onClick={() => {
                                  if (!window.confirm(`"${s.name}" xidməti silinsin?`)) return;
                                  void run(() => removeContractService(accessToken, contract.id, s.id));
                                }}
                              >
                                Sil
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={busy}
                            onClick={() =>
                              run(() => setContractServiceStatus(accessToken, contract.id, s.id, !s.isActive))
                            }
                          >
                            {s.isActive ? "Dayandır" : "Bərpa et"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isDraft && (
          <p className="panel-page-lead" style={{ margin: "12px 0 0" }}>
            Xidmətlərin qiyməti yalnız «Hazırlanır» mərhələsində dəyişdirilir — aktiv müqavilədə təsdiqlənmiş
            qiymətin sonradan dəyişməsi auditə ziddir. Tək xidməti dayandırmaq isə mümkündür.
          </p>
        )}
      </section>

      <section className="data-table-wrap purchase-lines">
        <h2>Tədarükçü borcları</h2>
        {chargesError && <p className="form-error">{chargesError}</p>}
        {charges === null && !chargesError ? (
          <p className="panel-page-lead">Yüklənir…</p>
        ) : (charges ?? []).length === 0 ? (
          <p className="panel-page-lead">
            Bu müqavilə üzrə hələ borc yaranmayıb. Cədvəl üzrə xidmət borcları avtomatik yaradılır.
          </p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Təsvir</th>
                  <th>Məbləğ</th>
                  <th>Ödənilib</th>
                  <th>Qalıq</th>
                  <th>Son tarix</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(charges ?? []).map((c) => {
                  const chargeStatus = vendorChargeStatusFromOrdinal(c.status);
                  return (
                    <tr key={c.id}>
                      <td>{c.description}</td>
                      <td>{money(c.amount)}</td>
                      <td>{money(c.paidAmount)}</td>
                      <td>
                        <strong>{money(c.outstandingAmount)}</strong>
                      </td>
                      <td>
                        {c.dueDate ? dateOnly(c.dueDate) : "—"}
                        {c.isOverdue && (
                          <span className="panel-role-tag panel-role-tag-inactive" style={{ marginLeft: 6 }}>
                            gecikib
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            chargeStatus === "Paid"
                              ? "owner-balance-tag-clear"
                              : chargeStatus === "Cancelled"
                                ? "panel-role-tag panel-role-tag-inactive"
                                : "owner-balance-tag-debt"
                          }
                        >
                          {VENDOR_CHARGE_STATUS_LABELS[chargeStatus]}
                        </span>
                      </td>
                      <td>
                        <div className="data-table-actions">
                          {canMakePayments && (chargeStatus === "Unpaid" || chargeStatus === "PartiallyPaid") && (
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm panel-btn-primary"
                              disabled={busy}
                              onClick={() => setPayForm(c)}
                            >
                              Ödə
                            </button>
                          )}
                          {canManage && chargeStatus !== "Paid" && chargeStatus !== "Cancelled" && (
                            <button
                              type="button"
                              className="panel-btn panel-btn-sm panel-btn-danger"
                              disabled={busy}
                              onClick={() => {
                                if (!window.confirm(`"${c.description}" borcu ləğv edilsin?`)) return;
                                void run(() => cancelVendorCharge(accessToken, c.id));
                              }}
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

      <section className="data-table-wrap purchase-detail-card">
        {!hasDocument && canMakePayments && (
          <div className="form-actions" style={{ justifyContent: "flex-start", margin: "0 0 14px" }}>
            <button type="button" className="panel-btn panel-btn-sm" disabled={exporting} onClick={handleExport}>
              {exporting ? "Yüklənir…" : "Sənədi yüklə (PDF)"}
            </button>
          </div>
        )}
        <SignedDocumentsPanel
          accessToken={accessToken}
          target={{ contractId: contract.id }}
          canUpload={canMakePayments}
          onAttachmentsChange={(list) => setHasDocument(list.length > 0)}
        />
      </section>

      {serviceForm && (
        <ServiceFormModal
          contract={contract}
          service={serviceForm.service}
          onClose={() => setServiceForm(null)}
          onSaved={() => {
            setServiceForm(null);
            load();
          }}
        />
      )}

      {datesOpen && (
        <DatesModal
          contract={contract}
          onClose={() => setDatesOpen(false)}
          onSaved={() => {
            setDatesOpen(false);
            load();
          }}
        />
      )}

      {payForm && (
        <PayChargeModal
          charge={payForm}
          onClose={() => setPayForm(null)}
          onSaved={() => {
            setPayForm(null);
            reload();
          }}
        />
      )}

      {terminateOpen && (
        <TerminateModal
          contract={contract}
          onClose={() => setTerminateOpen(false)}
          onSaved={() => {
            setTerminateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function PayChargeModal({
  charge,
  onClose,
  onSaved,
}: {
  charge: VendorChargeResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [amount, setAmount] = useState(String(charge.outstandingAmount));
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
        vendorId: charge.vendorId,
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
        {charge.description} · qalıq borc <strong>{charge.outstandingAmount.toFixed(2)} ₼</strong>
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="pay-amount">Məbləğ (₼)</label>
          <input
            id="pay-amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <p className="panel-page-lead" style={{ margin: "0 0 14px" }}>
          Ödəniş qeydə alınan kimi tranzaksiyalar jurnalına xərc kimi düşür.
        </p>
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

function ServiceFormModal({
  contract,
  service,
  onClose,
  onSaved,
}: {
  contract: ContractResponse;
  service: ContractServiceResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [name, setName] = useState(service?.name ?? "");
  const initialPeriod = service ? billingPeriodFromOrdinal(service.billingPeriod) : "Monthly";
  // Two shapes: a recurring service bills itself on a schedule (needs a period + optional
  // date range), a one-time service (repairs etc.) doesn't — its price often isn't even
  // known yet, so it's left blank here and filled in when the actual charge is raised.
  const [isOneTime, setIsOneTime] = useState(initialPeriod === "OneTime");
  const [recurringPeriod, setRecurringPeriod] = useState<Exclude<BillingPeriodKey, "OneTime">>(
    initialPeriod === "OneTime" ? "Monthly" : initialPeriod,
  );
  const [unitPrice, setUnitPrice] = useState(service && service.unitPrice > 0 ? String(service.unitPrice) : "");
  const [paymentTermDays, setPaymentTermDays] = useState(
    service?.paymentTermDays != null ? String(service.paymentTermDays) : "",
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [serviceStartDate, setServiceStartDate] = useState(
    service?.serviceStartDate ? dateOnly(service.serviceStartDate) : "",
  );
  const [serviceEndDate, setServiceEndDate] = useState(
    service?.serviceEndDate ? dateOnly(service.serviceEndDate) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = unitPrice ? Number(unitPrice) : 0;
    if (Number.isNaN(price) || price < 0) {
      setError("Qiymət mənfi ola bilməz.");
      return;
    }
    if (!isOneTime && !unitPrice) {
      setError("Davamlı xidmət üçün qiymət tələb olunur.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const request = {
        name,
        unitPrice: price,
        billingPeriod: isOneTime ? ("OneTime" as const) : recurringPeriod,
        paymentTermDays: paymentTermDays ? Number(paymentTermDays) : null,
        description: description || null,
        serviceStartDate: isOneTime ? null : serviceStartDate || null,
        serviceEndDate: isOneTime ? null : serviceEndDate || null,
      };

      if (service) {
        await updateContractService(accessToken, contract.id, service.id, request);
      } else {
        await addContractService(accessToken, contract.id, request);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={service ? "Xidməti redaktə et" : "Yeni xidmət"} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="service-name">Xidmətin adı</label>
          <input
            id="service-name"
            required
            placeholder="Liftə aylıq texniki xidmət"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="service-kind">Xidmət növü</label>
          <select
            id="service-kind"
            value={isOneTime ? "onetime" : "recurring"}
            onChange={(e) => setIsOneTime(e.target.value === "onetime")}
          >
            <option value="recurring">Davamlı (dövri) — aylıq/rüblük/illik haqq</option>
            <option value="onetime">Birdəfəlik — məs. təmir, qiyməti əvvəlcədən bəlli olmaya bilər</option>
          </select>
        </div>

        {isOneTime ? (
          <div className="form-field">
            <label htmlFor="service-price">Qiymət (opsional)</label>
            <input
              id="service-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="Bilinmirsə boş buraxın — xərc daxil edilərkən göstəriləcək"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        ) : (
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="service-price">Qiymət (₼)</label>
              <input
                id="service-price"
                type="number"
                min={0}
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="service-period">Hesablaşma dövrü</label>
              <select
                id="service-period"
                value={recurringPeriod}
                onChange={(e) => setRecurringPeriod(e.target.value as Exclude<BillingPeriodKey, "OneTime">)}
              >
                {BILLING_PERIODS_ORDERED.filter((key) => key !== "OneTime").map((key) => (
                  <option key={key} value={key}>
                    {BILLING_PERIOD_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="service-term">Ödəniş müddəti, gün (opsional)</label>
          <input
            id="service-term"
            type="number"
            min={0}
            step="1"
            value={paymentTermDays}
            onChange={(e) => setPaymentTermDays(e.target.value)}
          />
        </div>

        {!isOneTime && (
          <>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="service-start">Xidmətin başlanğıcı (opsional)</label>
                <input
                  id="service-start"
                  type="date"
                  value={serviceStartDate}
                  onChange={(e) => setServiceStartDate(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="service-end">Xidmətin bitməsi (opsional)</label>
                <input
                  id="service-end"
                  type="date"
                  value={serviceEndDate}
                  onChange={(e) => setServiceEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="panel-page-lead" style={{ margin: "0 0 14px" }}>
              Tarixlər boş buraxılarsa müqavilənin müddəti tətbiq olunur.
            </p>
          </>
        )}

        <div className="form-field">
          <label htmlFor="service-description">Təsvir</label>
          <input
            id="service-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : service ? "Saxla" : "Əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DatesModal({
  contract,
  onClose,
  onSaved,
}: {
  contract: ContractResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [startDate, setStartDate] = useState(dateOnly(contract.startDate));
  const [endDate, setEndDate] = useState(dateOnly(contract.endDate));
  const [note, setNote] = useState(contract.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateContract(accessToken, contract.id, { startDate, endDate, note: note || null });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Müqavilənin müddəti və qeydi" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="contract-start-edit">Başlanğıc tarixi</label>
            <input
              id="contract-start-edit"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="contract-end-edit">Bitmə tarixi</label>
            <input
              id="contract-end-edit"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="contract-note-edit">Qeyd</label>
          <textarea id="contract-note-edit" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
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

function TerminateModal({
  contract,
  onClose,
  onSaved,
}: {
  contract: ContractResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [terminatedOn, setTerminatedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(contract.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await terminateContract(accessToken, contract.id, terminatedOn, note || null);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Müqaviləni ləğv et" onClose={onClose}>
      <p className="panel-page-lead">
        Ləğv edilən müqavilədən artıq borc yaranmır və bitmə tarixi aşağıdakı tarixlə əvəz olunur.
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="terminate-date">Ləğv tarixi</label>
          <input
            id="terminate-date"
            type="date"
            required
            value={terminatedOn}
            onChange={(e) => setTerminatedOn(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="terminate-note">Səbəb / qeyd</label>
          <textarea id="terminate-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            İmtina
          </button>
          <button type="submit" className="panel-btn panel-btn-danger" disabled={saving}>
            {saving ? "Göndərilir…" : "Ləğv et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
