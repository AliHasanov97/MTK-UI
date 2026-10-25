"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPurchase } from "../../lib/api/purchases-client";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../lib/auth/roles";
import { formatDateTime } from "../../lib/format";
import {
  NOMENCLATURE_CATEGORY_LABELS,
  UNIT_LABELS,
  categoryFromOrdinal,
  getAllStock,
  recordIssue,
  searchNomenclatures,
  searchTransactions,
  unitFromOrdinal,
  type NomenclatureListItem,
  type TransactionDto,
  type TransactionTypeKey,
} from "../../lib/api/inventory";
import { Modal } from "../Modal";
import { errorMessage, formatMoney, formatQuantity } from "./shared";
import { EntityLink, entityHref } from "../EntityLinks";

const PAGE_SIZE = 10;
// The transaction search returns no total count and has no text search, so every
// row of the type is loaded once; search and pagination run client-side.
const FETCH_SIZE = 1000;

function isThisMonth(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/**
 * Daxilolma və çıxarış eyni cədvəli paylaşır — yalnız başlıq və (qəbulda) qaimə,
 * vahid qiymət/ümumi sütunları fərqlənir.
 *
 * Daxilolma **yalnız oxunur**: məhsullar Payments modulundaki alışlarda alınır və
 * orada qəbul edilir, anbara isə GoodsReceivedIntegrationEvent ilə düşür. Çıxarış
 * isə yenə buradan yaradılır.
 */
export function MovementView({ transactionType }: { transactionType: TransactionTypeKey }) {
  const auth = useAuth();
  const router = useRouter();
  const canManage = useCanDoEverything();
  const isReceipt = transactionType === "Receipt";
  const canCreate = canManage && !isReceipt;

  const [rows, setRows] = useState<TransactionDto[] | null>(null);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureListItem[]>([]);
  const [stockOnHand, setStockOnHand] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [invoiceNumbers, setInvoiceNumbers] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchTransactions(auth.accessToken, { transactionType, pageSize: FETCH_SIZE })
      .then((res) => {
        setRows(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, transactionType, reloadKey]);

  // Materials give the code, category and unit for each row (and feed the issue
  // form's picker); stock gives the current quantity on hand.
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchNomenclatures(auth.accessToken, {
      sortCriteria: { columnName: "Code", direction: 0 },
      pageSize: 500,
    })
      .then((res) => setNomenclatures(res.nomenclatures))
      .catch(() => {
        /* rows still render without the extra material columns */
      });
  }, [auth]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getAllStock(auth.accessToken, 1, FETCH_SIZE)
      .then((res) => setStockOnHand(new Map(res.map((s) => [s.nomenclatureId, s.quantityOnHand]))))
      .catch(() => {
        /* the stock column falls back to "—" */
      });
  }, [auth, reloadKey]);

  // A new search term restarts pagination from the first page.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setPageNumber(1);
  }

  const nomenclatureById = new Map(nomenclatures.map((n) => [n.id, n]));
  const term = search.trim().toLowerCase();
  const visible = (rows ?? []).filter((r) => {
    if (!term) return true;
    const n = nomenclatureById.get(r.nomenclatureId);
    const category = n ? NOMENCLATURE_CATEGORY_LABELS[categoryFromOrdinal(n.category)] : "";
    const invoice = r.referenceId ? (invoiceNumbers[r.referenceId] ?? "") : "";
    return `${n?.code ?? ""} ${r.nomenclatureName} ${category} ${invoice} ${r.notes ?? ""}`
      .toLowerCase()
      .includes(term);
  });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Invoice numbers are looked up only for the receipts on the visible page.
  useEffect(() => {
    if (!isReceipt || auth.status !== "authenticated" || pageRows.length === 0) return;
    const purchaseIds = [...new Set(pageRows.flatMap((row) => (row.referenceId ? [row.referenceId] : [])))]
      .filter((id) => !(id in invoiceNumbers));
    if (purchaseIds.length === 0) return;
    Promise.all(purchaseIds.map(async (id) => {
      try {
        const purchase = await getPurchase(auth.accessToken, id);
        return [id, purchase.invoiceNumber] as const;
      } catch {
        return [id, null] as const;
      }
    })).then((entries) => setInvoiceNumbers((current) => ({ ...current, ...Object.fromEntries(entries) })));
  }, [auth, isReceipt, pageRows, invoiceNumbers]);

  if (auth.status !== "authenticated") return null;

  if (error && !rows) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  const allRows = rows ?? [];
  const monthRows = allRows.filter((r) => isThisMonth(r.transactionDate));
  const materialCount = new Set(allRows.map((r) => r.nomenclatureId)).size;
  const receiptTotal = allRows.reduce((sum, r) => sum + (r.unitPrice ?? 0) * r.quantity, 0);
  const columnCount = isReceipt ? 9 : 6;

  return (
    <div>
      <div className="ledger-stats">
        <article className="ledger-stat ledger-stat-in">
          <span className="ledger-stat-label">{isReceipt ? "Daxilolma" : "Çıxarış"}</span>
          <strong className="ledger-value-in">{rows ? allRows.length : "…"}</strong>
          <span className="ledger-stat-caption">ümumi qeyd</span>
        </article>
        <article className="ledger-stat ledger-stat-net">
          <span className="ledger-stat-label">Bu ay</span>
          <strong className="ledger-value-in">{rows ? monthRows.length : "…"}</strong>
          <span className="ledger-stat-caption">
            {rows ? `${new Set(monthRows.map((r) => r.nomenclatureId)).size} material növü` : " "}
          </span>
        </article>
        <article className="ledger-stat ledger-stat-out">
          <span className="ledger-stat-label">{isReceipt ? "Ümumi məbləğ" : "Material növü"}</span>
          <strong className="ledger-value-in">
            {rows ? (isReceipt ? formatMoney(receiptTotal) : materialCount) : "…"}
          </strong>
          <span className="ledger-stat-caption">
            {isReceipt ? `${materialCount} material növü` : "fərqli material çıxarılıb"}
          </span>
        </article>
      </div>

      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder={isReceipt ? "Axtar (kod, material, qaimə, qeyd…)" : "Axtar (kod, material, kateqoriya, qeyd…)"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canCreate && (
          <button
            type="button"
            className="panel-btn panel-btn-primary"
            onClick={() => setFormOpen(true)}
          >
            + Yeni çıxarış
          </button>
        )}
      </div>

      {notice && (
        <p className="ledger-alert" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!rows ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <div className="vendor-head">
            <h3>{isReceipt ? "Daxilolmalar" : "Çıxarışlar"}</h3>
            <span className="vendor-count">{visible.length} qeyd</span>
          </div>
          <div className="owner-table-scroll">
            <table className={`data-table movement-table${isReceipt ? " movement-receipts" : ""}`}>
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Kod</th>
                  <th>Material</th>
                  {isReceipt && <th>Qaimə</th>}
                  <th className="vendor-th-amount">Miqdar</th>
                  {isReceipt && <th className="vendor-th-amount">Vahid qiymət</th>}
                  {isReceipt && <th className="vendor-th-amount">Ümumi</th>}
                  <th className="vendor-th-amount">Cari qalıq</th>
                  <th>Qeyd</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={columnCount}>
                      {allRows.length === 0
                        ? isReceipt
                          ? "Hələ daxilolma yoxdur — alışlar Payments bölməsində qəbul edilir."
                          : "Hələ çıxarış yoxdur."
                        : "Nəticə tapılmadı."}
                    </td>
                  </tr>
                )}
                {pageRows.map((r) => {
                  const n = nomenclatureById.get(r.nomenclatureId);
                  const unit = n ? UNIT_LABELS[unitFromOrdinal(n.unit)] : "";
                  const onHand = stockOnHand.get(r.nomenclatureId);
                  return (
                    <tr key={r.id} className="data-table-row-clickable" onClick={() => router.push(`/panel/inventar/materiallar/${r.nomenclatureId}`)}>
                      <td>{formatDateTime(r.transactionDate)}</td>
                      <td><EntityLink href={entityHref.nomenclature(r.nomenclatureId)}>{n?.code}</EntityLink></td>
                      <td className="vendor-cell-vendor">
                        <Link className="owner-link" href={`/panel/inventar/materiallar/${r.nomenclatureId}`} onClick={(event) => event.stopPropagation()}>{r.nomenclatureName}</Link>
                        {n && <span className="vendor-cell-sub">{NOMENCLATURE_CATEGORY_LABELS[categoryFromOrdinal(n.category)]}</span>}
                      </td>
                      {isReceipt && <td>{r.referenceId ? <Link className="owner-link" href={`/panel/maliyye-emeliyyatlari/salinmalar/${r.referenceId}`} onClick={(event) => event.stopPropagation()}>{invoiceNumbers[r.referenceId] ?? "Qaiməyə bax"}</Link> : "—"}</td>}
                      <td className="vendor-amount">
                        <strong>{formatQuantity(r.quantity)}</strong> {unit}
                      </td>
                      {isReceipt && (
                        <td className="vendor-amount">
                          {r.unitPrice != null ? formatMoney(r.unitPrice) : "—"}
                        </td>
                      )}
                      {isReceipt && (
                        <td className="vendor-amount">
                          {r.unitPrice != null ? formatMoney(r.unitPrice * r.quantity) : "—"}
                        </td>
                      )}
                      <td className="vendor-amount">
                        {onHand != null ? `${formatQuantity(onHand)} ${unit}` : "—"}
                      </td>
                      <td className="ledger-cell-note">{r.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visible.length > 0 && (
            <div className="panel-pagination">
              <span>
                Səhifə {currentPage}/{pageCount}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="panel-btn panel-btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPageNumber(Math.max(1, currentPage - 1))}
                >
                  Əvvəlki
                </button>
                <button
                  type="button"
                  className="panel-btn panel-btn-sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPageNumber(currentPage + 1)}
                >
                  Növbəti
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {formOpen && !isReceipt && (
        <IssueFormModal
          nomenclatures={nomenclatures}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setNotice("Çıxarış qeydə alındı.");
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function IssueFormModal({
  nomenclatures,
  onClose,
  onSaved,
}: {
  nomenclatures: NomenclatureListItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [nomenclatureId, setNomenclatureId] = useState(nomenclatures[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nomenclatureId) {
      setError("Material seçilməlidir.");
      return;
    }
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Miqdar 0-dan böyük olmalıdır.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordIssue(accessToken, {
        nomenclatureId,
        quantity: qty,
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
    <Modal title="Yeni çıxarış" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="mov-nomenclature">Material</label>
          <select
            id="mov-nomenclature"
            required
            value={nomenclatureId}
            onChange={(e) => setNomenclatureId(e.target.value)}
          >
            {nomenclatures.length === 0 && <option value="">Material yoxdur</option>}
            {nomenclatures.map((n) => (
              <option key={n.id} value={n.id}>
                {n.code} — {n.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="mov-quantity">Miqdar</label>
          <input
            id="mov-quantity"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="mov-notes">Qeyd</label>
          <textarea
            id="mov-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Qeyd et"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
