"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import { SortDirection } from "../../lib/api/buildings";
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
import { PayButton, useCreatedBy, useCreatedByMap } from "../binalar/finance";

const PAGE_SIZE = 20;
// One bigger pull, status segmented client-side (the ledger pattern): the
// server-side QueryFilter can only express one comparison, and the stats need
// the whole picture anyway.
const FETCH_SIZE = 500;

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
  const [charges, setCharges] = useState<ChargeResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const allocationCreators = useCreatedByMap(auth.status === "authenticated" ? auth.accessToken : "", "PaymentAllocation");

  // Hansı borcun hansı ödənişlərlə (avansdan və ya birbaşa) bağlandığı — tələb
  // üzrə yüklənir, çünki sətir sayı çox ola bilər.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocationsByCharge, setAllocationsByCharge] = useState<Record<string, ChargeAllocationResponse[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    searchCharges(auth.accessToken, {
      sortCriteria: { columnName: "CreatedAt", direction: SortDirection.Descending },
      pageSize: FETCH_SIZE,
    })
      .then((res) => {
        setCharges(res.charges);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

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

  const term = search.trim().toLowerCase();
  const visible = (charges ?? []).filter((c) => {
    const status = chargeStatusFromOrdinal(c.status);
    if (scope === "open" && status === "Paid") return false;
    if (scope === "paid" && status !== "Paid") return false;
    if (term) {
      const owner = c.partyName ?? "";
      const property = c.propertyLabel ?? "";
      const haystack = `${owner} ${property} ${c.period ?? ""} ${c.description ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const openCharges = (charges ?? []).filter((c) => chargeStatusFromOrdinal(c.status) !== "Paid");
  const totalOpen = openCharges.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);
  const totalPaidAll = (charges ?? []).reduce((sum, c) => sum + c.paidAmount, 0);
  const ownerCount = new Set(openCharges.map((c) => c.ownerId)).size;

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowAddCharge(true)}>
            + Yeni haqq əlavə et
          </button>
        )}
      </div>

      <section className="debt-summary-grid" aria-label="Borc xülasəsi">
        <article className="debt-summary-card debt-summary-open">
          <span className="debt-summary-label">Açıq borc</span>
          <strong>{formatMoney(totalOpen)}</strong>
          <span>{openCharges.length} ödənilməmiş haqq</span>
        </article>
        <article className="debt-summary-card debt-summary-paid">
          <span className="debt-summary-label">Ödənilmiş</span>
          <strong>{formatMoney(totalPaidAll)}</strong>
          <span>Bütün dövrlər üzrə</span>
        </article>
        <article className="debt-summary-card debt-summary-owners">
          <span className="debt-summary-label">Borclu sakinlər</span>
          <strong>{ownerCount}</strong>
          <span>Açıq borcu olan sakinlər</span>
        </article>
      </section>

      {error && <p className="ledger-alert" role="alert">{error}</p>}

      <section className="debt-filter-card" aria-label="Borc axtarışı və filtrləri">
        <div className="debt-filter-title">
          <div>
            <h2>Borc siyahısı</h2>
            <p>{visible.length} haqq göstərilir</p>
          </div>
          <input
            className="panel-search debt-search"
            placeholder="Sakin, əmlak və ya dövr üzrə axtar"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
          {pageRows.map((c) => {
            const status = chargeStatusFromOrdinal(c.status);
            const remaining = c.amount - c.paidAmount;
            const propertyType: PropertyTypeKey | undefined = c.apartmentId
              ? "Apartment"
              : c.garageId
                ? "Garage"
                : undefined;
            const propertyId = c.apartmentId ?? c.garageId ?? undefined;
            const allocations = allocationsByCharge[c.id];
            const fromAdvance = (allocations ?? []).some(
              (allocation) => new Date(allocation.paymentDate) < new Date(c.issuedOn),
            );

            return (
              <article className="debt-charge-card" key={c.id}>
                <div className="debt-charge-top">
                  <div className="debt-resident">
                    <Link className="owner-link" href={`/panel/binalar/sahibler/${c.ownerId}`}>
                      {c.partyName ?? "Sakin"}
                    </Link>
                    {c.description && <span>{c.description}</span>}
                    {fromAdvance && <span className="debt-advance-note">Avansdan ödənilib</span>}
                  </div>
                  <span className={`vendor-status ${
                    status === "Paid" ? "vendor-status-paid" : status === "PartiallyPaid" ? "vendor-status-partial" : "vendor-status-open"
                  }`}>
                    {CHARGE_STATUS_LABELS[status]}
                  </span>
                </div>

                <div className="debt-charge-details">
                  <div><span>Əmlak</span><strong>{c.propertyLabel ?? "—"}</strong></div>
                  <div><span>Dövr</span><strong>{c.period || "—"}</strong><small>Yaranma tarixi: {formatDateTime(c.issuedOn)}</small></div>
                  <div><span>Ümumi məbləğ</span><strong>{formatMoney(c.amount)}</strong></div>
                  <div><span>Ödənilib</span><strong>{formatMoney(c.paidAmount)}</strong></div>
                </div>

                <div className="debt-charge-footer">
                  <div className="debt-remaining">
                    <span>Qalıq borc</span>
                    <strong className={remaining > 0 ? "vendor-value-danger" : "vendor-value-ok"}>{formatMoney(remaining)}</strong>
                  </div>
                  <div className="debt-charge-actions">
                    <button
                      type="button"
                      className="panel-btn panel-btn-sm"
                      aria-haspopup="dialog"
                      onClick={() => toggleAllocations(c.id)}
                    >
                      {loadingId === c.id ? "Yüklənir…" : "Ödəniş bölgüsünə bax"}
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
                </div>

              </article>
            );
          })}
        </div>
      )}

      {visible.length > PAGE_SIZE && (
        <div className="debt-pagination">
          <span>{visible.length} haqq · Səhifə {page}/{pageCount}</span>
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
          <div className="debt-allocation-modal">
            <div className="debt-allocation-summary">
              <div>
                <span>Sakin</span>
                <strong>{selectedCharge.partyName ?? "—"}</strong>
              </div>
              <div>
                <span>Əmlak və dövr</span>
                <strong>{selectedCharge.propertyLabel ?? "—"} · {selectedCharge.period ?? "—"}</strong>
              </div>
              <div>
                <span>Haqqın məbləği</span>
                <strong>{formatMoney(selectedCharge.amount)}</strong>
              </div>
              <div>
                <span>Qalıq borc</span>
                <strong>{formatMoney(selectedCharge.amount - selectedCharge.paidAmount)}</strong>
              </div>
            </div>

            <ChargeCreatedByLine accessToken={auth.accessToken} chargeId={selectedCharge.id} />

            {loadingId === selectedCharge.id ? (
              <p className="panel-page-lead">Ödəniş məlumatları yüklənir…</p>
            ) : (allocationsByCharge[selectedCharge.id]?.length ?? 0) === 0 ? (
              <div className="debt-allocation-empty">Bu haqqa hələ ödəniş tətbiq olunmayıb.</div>
            ) : (
              <div className="debt-allocation-list">
                {(allocationsByCharge[selectedCharge.id] ?? []).map((allocation) => (
                  <div className="debt-allocation-item" key={allocation.id}>
                    <div><span>Ödəniş tarixi</span><strong>{formatDateTime(allocation.paymentDate)}</strong></div>
                    <div><span>Məbləğ</span><strong>{formatMoney(allocation.allocatedAmount)}</strong></div>
                    <div>
                      <span>Mənbə</span>
                      <strong className={`vendor-status ${allocation.isFromAdvance ? "vendor-status-partial" : "vendor-status-paid"}`}>
                        {allocation.isFromAdvance ? "Avansdan" : "Birbaşa ödəniş"}
                      </strong>
                    </div>
                    <div><span>İcra edən</span><strong>{allocationCreators[allocation.id] ?? "—"}</strong></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
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
