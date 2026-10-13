"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything, useIsAdmin } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import { QueryComparisonType, SortDirection, type QueryFilter } from "../../lib/api/buildings";
import { formatDateTime } from "../../lib/format";
import { GARAGE_TYPE_LABELS, type GarageTypeKey } from "../../lib/api/garages";
import { getOwnerById, type Owner, type OwnerListItem } from "../../lib/api/owners";
import {
  CHARGE_STATUS_LABELS,
  chargeStatusFromOrdinal,
  createCharge,
  getChargeAllocations,
  searchCharges,
  type ChargeAllocationResponse,
  type ChargeResponse,
  type PropertyTypeKey,
} from "../../lib/api/payments";
import { Modal } from "../Modal";
import { OwnerPicker } from "../binalar/OwnerPicker";
import { GenerateChargesModal } from "./GenerateChargesModal";
import { PayButton, useCreatedBy, useCreatedByMap } from "../binalar/finance";

const PAGE_SIZE = 20;

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (n: number) => `${money.format(n)} ₼`;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

type Scope = "open" | "paid" | "all";

// Haqqın özünü kim yaradıb — accordion sətri hər açılanda ayrıca component kimi
// render olunur (useCreatedBy-ni birbaşa .map() içində çağırmaq Rules of Hooks-u
// pozardı).
function ChargeCreatedByLine({ accessToken, chargeId }: { accessToken: string; chargeId: string }) {
  const createdBy = useCreatedBy(accessToken, "Charge", chargeId);
  if (!createdBy) return null;
  return (
    <p className="vendor-note" style={{ margin: "0 0 10px" }}>
      Haqqı yaradan: <strong>{createdBy}</strong>
    </p>
  );
}

export function BorclarView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const isAdmin = useIsAdmin();
  const [charges, setCharges] = useState<ChargeResponse[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const allocationCreators = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "PaymentAllocation");

  // Hansı borcun hansı ödənişlərlə (avansdan və ya birbaşa) bağlandığı — tələb
  // üzrə yüklənir, çünki sətir sayı çox ola bilər.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocationsByCharge, setAllocationsByCharge] = useState<Record<string, ChargeAllocationResponse[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Axtarış debounce olunur ki, hər düymə basışında sorğu getməsin.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Server tərəfli filtr + axtarış + səhifələmə. Status enum-u rəqəm kimi gedir:
  // Unpaid=0, PartiallyPaid=1, Paid=2, Cancelled=3. Ləğv edilmiş borc açıq borc
  // sayılmır. OwnerId üzrə sıralama eyni sahibin haqlarını yan-yana saxlayır.
  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    const filters: QueryFilter[] = [];
    if (scope === "open") {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.NotEquals, value: 2 });
      filters.push({ columnName: "Status", comparison: QueryComparisonType.NotEquals, value: 3 });
    } else if (scope === "paid") {
      filters.push({ columnName: "Status", comparison: QueryComparisonType.Equals, value: 2 });
    }
    searchCharges(auth.accessToken, {
      filters,
      searchTerm: searchTerm || undefined,
      sortCriteria: { columnName: "OwnerId", direction: SortDirection.Ascending },
      page: page - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setCharges(res.charges);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, scope, searchTerm, page]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (auth.status !== "authenticated") return null;

  // Arrow (not a hoisted function declaration) so TypeScript keeps the
  // "authenticated" narrowing of `auth` inside this closure.
  const toggleAllocations = (chargeId: string) => {
    if (expandedId === chargeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(chargeId);
    if (!allocationsByCharge[chargeId]) {
      setLoadingId(chargeId);
      getChargeAllocations(auth.accessToken, chargeId)
        .then((res) => setAllocationsByCharge((prev) => ({ ...prev, [chargeId]: res })))
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoadingId(null));
    }
  };

  const visible = charges ?? [];

  // Sahibə görə qruplaşdırma (səhifədəki haqlar OwnerId ilə sıralanıb)
  const groupMap = new Map<string, { ownerId: string; name: string; charges: ChargeResponse[] }>();
  for (const c of visible) {
    const group = groupMap.get(c.ownerId);
    if (group) group.charges.push(c);
    else groupMap.set(c.ownerId, { ownerId: c.ownerId, name: c.partyName ?? "Sakin", charges: [c] });
  }
  const pageGroups = Array.from(groupMap.values());
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectedCharge = charges?.find((charge) => charge.id === expandedId) ?? null;

  return (
    <div className="panel-page debt-page">
      <div className="panel-page-head debt-page-heading">
        <div>
          <div className="eyebrow">MALİYYƏ İZLƏMƏSİ</div>
          <h1>Borclar</h1>
          <p className="panel-page-lead">Sakinlər üzrə açıq haqları, ödənişləri və qalıq borcları izləyin.</p>
        </div>
        {canManage && (
          <div className="debt-head-actions">
            {isAdmin && (
              <button type="button" className="panel-btn" onClick={() => setShowGenerate(true)}>
                Dövr üçün borcları yarat
              </button>
            )}
            <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowAddCharge(true)}>
              + Yeni haqq əlavə et
            </button>
          </div>
        )}
      </div>

      {error && <p className="ledger-alert" role="alert">{error}</p>}

      <section className="debt-filter-card" aria-label="Borc axtarışı və filtrləri">
        <div className="debt-filter-title">
          <div>
            <h2>Borc siyahısı</h2>
            <p>{totalCount} haqq</p>
          </div>
          <input
            className="panel-search debt-search"
            placeholder="Sakin, mənzil/qaraj nömrəsi və ya dövr üzrə axtar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="debt-filter-options">
          <div className="ledger-segmented" role="group" aria-label="Borc vəziyyəti">
            {(["open", "paid", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                className={scope === value ? "active" : ""}
                onClick={() => {
                  setScope(value);
                  setPage(1);
                }}
              >
                {value === "open" ? "Açıq borclar" : value === "paid" ? "Ödənilib" : "Hamısı"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!charges ? (
        <div className="debt-charge-list" aria-label="Borclar yüklənir">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="debt-charge-skeleton" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="debt-empty">
          <span aria-hidden="true">₼</span>
          <strong>{scope === "open" ? "Açıq borc yoxdur" : "Uyğun borc tapılmadı"}</strong>
          <p>{scope === "open" ? "Bütün haqlar ödənilib." : "Axtarışı dəyişin və ya başqa filtri seçin."}</p>
        </div>
      ) : (
        <div className="debt-charge-list">
          {pageGroups.map((group) => {
            const groupRemaining = group.charges.reduce((sum, c) => {
              const s = chargeStatusFromOrdinal(c.status);
              return s === "Cancelled" ? sum : sum + (c.amount - c.paidAmount);
            }, 0);
            return (
              <article className="debt-charge-card debt-group-card" key={group.ownerId} aria-label={`${group.name} borcları`}>
                <div className="debt-charge-top debt-group-head">
                  <div className="debt-resident">
                    <Link className="owner-link" href={`/panel/binalar/sahibler/${group.ownerId}`}>
                      {group.name}
                    </Link>
                    <span>{group.charges.length} haqq</span>
                  </div>
                  <div className="debt-charge-actions">
                    <PayButton
                      ownerId={group.ownerId}
                      balance={-groupRemaining}
                      label="Hesaba ödəniş əlavə et"
                      alwaysEnabled
                      onPaid={load}
                    />
                  </div>
                  <div className="debt-remaining debt-group-total">
                    <span>Səhifədə qalıq</span>
                    <strong className={groupRemaining > 0 ? "vendor-value-danger" : "vendor-value-ok"}>
                      {formatMoney(groupRemaining)}
                    </strong>
                  </div>
                </div>

                <div className="owner-table-scroll">
                  <table className="data-table debt-group-table">
                    <thead>
                      <tr>
                        <th>Əmlak</th>
                        <th>Dövr</th>
                        <th className="vendor-th-amount">Məbləğ</th>
                        <th className="vendor-th-amount">Ödənilib</th>
                        <th className="vendor-th-amount">Qalıq</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {group.charges.map((c) => {
                        const status = chargeStatusFromOrdinal(c.status);
                        const remaining = c.amount - c.paidAmount;
                        const propertyType: PropertyTypeKey | undefined = c.apartmentId
                          ? "Apartment"
                          : c.garageId
                            ? "Garage"
                            : undefined;
                        const propertyId = c.apartmentId ?? c.garageId ?? undefined;
                        const fromAdvance = (allocationsByCharge[c.id] ?? []).some(
                          (allocation) => new Date(allocation.paymentDate) < new Date(c.issuedOn),
                        );
                        return (
                          <tr key={c.id}>
                            <td data-label="Əmlak">
                              {c.propertyLabel ?? "—"}
                              {c.description && <div className="vendor-note">{c.description}</div>}
                              {fromAdvance && <div className="debt-advance-note">Avansdan ödənilib</div>}
                            </td>
                            <td data-label="Dövr">
                              {c.period || "—"}
                              <div className="vendor-note">{formatDateTime(c.issuedOn)}</div>
                            </td>
                            <td className="vendor-amount" data-label="Məbləğ">{formatMoney(c.amount)}</td>
                            <td className="vendor-amount" data-label="Ödənilib">{formatMoney(c.paidAmount)}</td>
                            <td data-label="Qalıq" className={`vendor-amount ${remaining > 0 ? "vendor-value-danger" : "vendor-value-ok"}`}>
                              {formatMoney(remaining)}
                            </td>
                            <td data-label="Status">
                              <span className={`vendor-status ${
                                status === "Paid" ? "vendor-status-paid" : status === "PartiallyPaid" ? "vendor-status-partial" : "vendor-status-open"
                              }`}>
                                {CHARGE_STATUS_LABELS[status]}
                              </span>
                            </td>
                            <td>
                              <div className="debt-charge-actions">
                                <button
                                  type="button"
                                  className="panel-btn panel-btn-sm"
                                  aria-haspopup="dialog"
                                  onClick={() => toggleAllocations(c.id)}
                                >
                                  {loadingId === c.id ? "Yüklənir…" : "Bölgü"}
                                </button>
                                {remaining > 0 && (
                                  <PayButton
                                    ownerId={c.ownerId}
                                    propertyId={propertyId}
                                    propertyType={propertyType}
                                    balance={-remaining}
                                    onPaid={load}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="debt-pagination">
          <span>{totalCount} haqq · Səhifə {page}/{pageCount}</span>
          <div>
            <button type="button" className="panel-btn panel-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Əvvəlki</button>
            <button type="button" className="panel-btn panel-btn-sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Növbəti</button>
          </div>
        </div>
      )}

      {selectedCharge && (
        <Modal
          title="Ödəniş bölgüsü"
          onClose={() => setExpandedId(null)}
          wide
        >
          <div className="transaction-document-modal">
            <section className="data-table-wrap purchase-detail-card">
              <h3>Haqq məlumatı</h3>
              <dl className="purchase-meta">
                <div><dt>Sakin</dt><dd>{selectedCharge.partyName ?? "—"}</dd></div>
                <div><dt>Əmlak və dövr</dt><dd>{selectedCharge.propertyLabel ?? "—"} · {selectedCharge.period ?? "—"}</dd></div>
                <div><dt>Haqqın məbləği</dt><dd>{formatMoney(selectedCharge.amount)}</dd></div>
                <div><dt>Qalıq borc</dt><dd>{formatMoney(selectedCharge.amount - selectedCharge.paidAmount)}</dd></div>
              </dl>
              <ChargeCreatedByLine accessToken={auth.accessToken} chargeId={selectedCharge.id} />
            </section>

            <section className="data-table-wrap purchase-detail-card">
              <h3>Ödənişlər</h3>
              {loadingId === selectedCharge.id ? (
                <p className="panel-page-lead">Ödəniş məlumatları yüklənir…</p>
              ) : (allocationsByCharge[selectedCharge.id]?.length ?? 0) === 0 ? (
                <p className="panel-page-lead">Bu haqqa hələ ödəniş tətbiq olunmayıb.</p>
              ) : (
                <div className="owner-table-scroll">
                  <table className="data-table">
                    <thead><tr><th>Ödəniş tarixi</th><th className="vendor-th-amount">Məbləğ</th><th>Mənbə</th><th>İcra edən</th></tr></thead>
                    <tbody>
                      {(allocationsByCharge[selectedCharge.id] ?? []).map((allocation) => (
                        <tr key={allocation.id}>
                          <td>{formatDateTime(allocation.paymentDate)}</td>
                          <td className="vendor-amount">{formatMoney(allocation.allocatedAmount)}</td>
                          <td>
                            <span className={`vendor-status ${allocation.isFromAdvance ? "vendor-status-partial" : "vendor-status-paid"}`}>
                              {allocation.isFromAdvance ? "Avansdan" : "Birbaşa ödəniş"}
                            </span>
                          </td>
                          <td>{allocationCreators[allocation.id] ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </Modal>
      )}

      {showGenerate && (
        <GenerateChargesModal
          accessToken={auth.accessToken}
          onClose={() => setShowGenerate(false)}
          onDone={() => setReloadKey((k) => k + 1)}
        />
      )}

      {showAddCharge && (
        <AddChargeModal
          accessToken={auth.accessToken}
          onClose={() => setShowAddCharge(false)}
          onSaved={() => {
            setShowAddCharge(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function AddChargeModal({
  accessToken,
  onClose,
  onSaved,
}: {
  accessToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [owner, setOwner] = useState<OwnerListItem | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<Owner | null>(null);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!owner) {
      Promise.resolve().then(() => setOwnerDetail(null));
      return;
    }
    Promise.resolve().then(() => setTarget(""));
    getOwnerById(accessToken, owner.id)
      .then(setOwnerDetail)
      .catch((err) => setError(errorMessage(err)));
  }, [accessToken, owner]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!owner || !target) {
      setError("Sahib və əmlak seçilməlidir.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }
    const [kind, id] = target.split(":");
    setSaving(true);
    setError(null);
    try {
      await createCharge(accessToken, {
        ownerId: owner.id,
        apartmentId: kind === "apartment" ? id : null,
        garageId: kind === "garage" ? id : null,
        amount: numericAmount,
        description,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni haqq əlavə et" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <OwnerPicker selected={owner} onSelect={setOwner} />
        {ownerDetail && (
          <div className="form-field">
            <label htmlFor="charge-target">Əmlak</label>
            <select id="charge-target" value={target} onChange={(e) => setTarget(e.target.value)} required>
              <option value="" disabled>
                Seçin…
              </option>
              {ownerDetail.apartments.map((a) => (
                <option key={a.id} value={`apartment:${a.id}`}>
                  Mənzil {a.apartmentNumber} — {a.building.name}
                </option>
              ))}
              {ownerDetail.garages.map((g) => (
                <option key={g.id} value={`garage:${g.id}`}>
                  Qaraj {g.garageNumber} ({GARAGE_TYPE_LABELS[g.type as GarageTypeKey] ?? g.type})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="charge-amount">Məbləğ (₼)</label>
            <input
              id="charge-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="charge-description">Təsvir (məs. &quot;Zədə haqqı&quot;)</label>
            <input
              id="charge-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={!owner || !target || saving}>
            {saving ? "Saxlanılır…" : "Əlavə et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
