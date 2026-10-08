"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPurchase } from "../../lib/api/purchases-client";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../lib/auth/roles";
import { formatDateTime } from "../../lib/format";
import {
  recordIssue,
  searchNomenclatures,
  searchTransactions,
  type NomenclatureListItem,
  type TransactionDto,
  type TransactionTypeKey,
} from "../../lib/api/inventory";
import { Modal } from "../Modal";
import { errorMessage, formatMoney, formatQuantity } from "./shared";

/**
 * Daxilolma və çıxarış eyni cədvəli paylaşır — yalnız başlıq və (qəbulda) vahid
 * qiymət/ümumi sütunları fərqlənir.
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [invoiceNumbers, setInvoiceNumbers] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchTransactions(auth.accessToken, { transactionType, pageSize: 200 })
      .then((res) => {
        setRows(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, transactionType, reloadKey]);

  useEffect(() => {
    if (!isReceipt || auth.status !== "authenticated" || !rows?.length) return;
    const purchaseIds = [...new Set(rows.flatMap((row) => row.referenceId ? [row.referenceId] : []))]
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
  }, [auth, isReceipt, rows, invoiceNumbers]);

  useEffect(() => {
    // Material seçimi yalnız çıxarış forması üçün lazımdır.
    if (auth.status !== "authenticated" || isReceipt) return;
    searchNomenclatures(auth.accessToken, {
      sortCriteria: { columnName: "Code", direction: 0 },
      pageSize: 500,
    })
      .then((res) => setNomenclatures(res.nomenclatures))
      .catch(() => {
        /* the picker is only needed for the create form */
      });
  }, [auth, isReceipt]);

  if (auth.status !== "authenticated") return null;

  const term = search.trim().toLowerCase();
  const visible = (rows ?? []).filter((r) =>
    term ? `${r.nomenclatureName} ${r.notes ?? ""}`.toLowerCase().includes(term) : true,
  );

  if (error && !rows) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (material, qeyd…)"
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
                  <th>Material</th>
                  {isReceipt && <th>Qaimə</th>}
                  <th className="vendor-th-amount">Miqdar</th>
                  {isReceipt && <th className="vendor-th-amount">Vahid qiymət</th>}
                  {isReceipt && <th className="vendor-th-amount">Ümumi</th>}
                  <th>Qeyd</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={isReceipt ? 7 : 4}>
                      {rows.length === 0
                        ? isReceipt
                          ? "Hələ daxilolma yoxdur — alışlar Payments bölməsində qəbul edilir."
                          : "Hələ çıxarış yoxdur."
                        : "Nəticə tapılmadı."}
                    </td>
                  </tr>
                )}
                {visible.map((r) => (
                  <tr key={r.id} className="data-table-row-clickable" onClick={() => router.push(`/panel/inventar/materiallar/${r.nomenclatureId}`)}>
                    <td>{formatDateTime(r.transactionDate)}</td>
                    <td className="vendor-cell-vendor"><Link className="owner-link" href={`/panel/inventar/materiallar/${r.nomenclatureId}`} onClick={(event) => event.stopPropagation()}>{r.nomenclatureName}</Link></td>
                    {isReceipt && <td>{r.referenceId ? <Link className="owner-link" href={`/panel/maliyye-emeliyyatlari/salinmalar/${r.referenceId}`} onClick={(event) => event.stopPropagation()}>{invoiceNumbers[r.referenceId] ?? "Qaiməyə bax"}</Link> : "—"}</td>}
                    <td className="vendor-amount">{formatQuantity(r.quantity)}</td>
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
                    <td className="ledger-cell-note">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
