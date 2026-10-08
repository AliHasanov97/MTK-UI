"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "../../../../lib/api/client";
import {
  categoryFromOrdinal,
  getNomenclature,
  getStockByNomenclature,
  NOMENCLATURE_CATEGORY_LABELS,
  unitFromOrdinal,
  UNIT_LABELS,
  type NomenclatureResponse,
} from "../../../../lib/api/inventory";
import {
  getPurchase,
  getNomenclaturePurchaseHistory,
  purchaseStatusLabel,
  type NomenclaturePurchaseHistoryItem,
} from "../../../../lib/api/purchases-client";
import { useAuth } from "../../../../lib/auth/AuthContext";
import { dateOnly } from "../../../../lib/format";
import { formatMoney, formatQuantity } from "../../shared";
import { searchTransactions, type TransactionDto } from "../../../../lib/api/inventory";

function detailErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Nomenklatura tapılmadı.";
    if (error.status === 401 || error.status === 403) return "Bu məlumatlara baxmaq üçün icazəniz yoxdur.";
    return `Məlumat yüklənmədi (${error.status}): ${error.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function NomenclatureDetailView({ nomenclatureId }: { nomenclatureId: string }) {
  const auth = useAuth();
  const [nomenclature, setNomenclature] = useState<NomenclatureResponse | null>(null);
  const [history, setHistory] = useState<NomenclaturePurchaseHistoryItem[] | null>(null);
  const [vendorIds, setVendorIds] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<TransactionDto[] | null>(null);
  const [stockQuantity, setStockQuantity] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([
      getNomenclature(auth.accessToken, nomenclatureId),
      getNomenclaturePurchaseHistory(auth.accessToken, nomenclatureId),
      searchTransactions(auth.accessToken, { nomenclatureId, transactionType: "Issue", pageSize: 200 }),
      getStockByNomenclature(auth.accessToken, nomenclatureId).catch((err: unknown) => {
        if (err instanceof ApiError && (err.status === 400 || err.status === 404)) return null;
        throw err;
      }),
    ])
      .then(([item, purchases, issueRows, stock]) => {
        setNomenclature(item);
        setHistory(purchases);
        setIssues(issueRows);
        setStockQuantity(stock?.quantityOnHand ?? 0);
        setError(null);
      })
      .catch((err: unknown) => setError(detailErrorMessage(err)));
  }, [auth, nomenclatureId]);

  useEffect(() => {
    if (auth.status !== "authenticated" || !history) return;
    const purchaseIds = [...new Set(history
      .filter((entry) => !entry.vendorId && !vendorIds[entry.purchaseId])
      .map((entry) => entry.purchaseId))];
    if (purchaseIds.length === 0) return;

    Promise.all(purchaseIds.map(async (purchaseId) => {
      try {
        const purchase = await getPurchase(auth.accessToken, purchaseId);
        return [purchaseId, purchase.vendorId] as const;
      } catch {
        return null;
      }
    })).then((results) => {
      const resolved = Object.fromEntries(results.filter((item): item is NonNullable<typeof item> => item !== null));
      if (Object.keys(resolved).length) setVendorIds((current) => ({ ...current, ...resolved }));
    });
  }, [auth, history, vendorIds]);

  if (auth.status !== "authenticated") return null;
  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
        <Link className="panel-btn" href="/panel/inventar/materiallar">Materiallara qayıt</Link>
      </div>
    );
  }
  if (!nomenclature || !history || !issues || stockQuantity === null) return <p className="panel-page-lead">Məlumat yüklənir…</p>;

  const lastPurchase = history[0];
  const lastVendorId = lastPurchase?.vendorId || (lastPurchase ? vendorIds[lastPurchase.purchaseId] : undefined);

  return (
    <div className="purchase-detail">
      <div className="purchase-detail-grid">
        <section className="data-table-wrap purchase-detail-card">
          <h2>Ümumi məlumat</h2>
          <dl className="purchase-meta">
            <div><dt>Kod</dt><dd>{nomenclature.code}</dd></div>
            <div><dt>Nomenklatura</dt><dd>{nomenclature.name}</dd></div>
            <div><dt>Kateqoriya</dt><dd>{NOMENCLATURE_CATEGORY_LABELS[categoryFromOrdinal(nomenclature.category)]}</dd></div>
            <div><dt>Ölçü vahidi</dt><dd>{UNIT_LABELS[unitFromOrdinal(nomenclature.unit)]}</dd></div>
            <div><dt>Minimum ehtiyat</dt><dd>{nomenclature.minStockLevel == null ? "—" : formatQuantity(nomenclature.minStockLevel)}</dd></div>
            <div><dt>Anbarda olan</dt><dd>{formatQuantity(stockQuantity)}</dd></div>
            <div><dt>Status</dt><dd>{nomenclature.isActive ? "Aktiv" : "Deaktiv"}</dd></div>
            <div><dt>Təsvir</dt><dd>{nomenclature.description || "—"}</dd></div>
          </dl>
        </section>
        <section className="data-table-wrap purchase-detail-card">
          <h2>Son alış qiyməti</h2>
          {lastPurchase ? (
            <>
              <p className="purchase-total">{formatMoney(lastPurchase.unitPrice)}</p>
              <p className="panel-page-lead">
                {lastVendorId ? (
                  <Link className="owner-link" href={`/panel/tedarukculer/${lastVendorId}`}>
                    {lastPurchase.vendorName ?? "Tədarükçü"}
                  </Link>
                ) : lastPurchase.vendorName ?? "Tədarükçü məlum deyil"} · {dateOnly(lastPurchase.purchaseDate)}
              </p>
            </>
          ) : (
            <p className="panel-page-lead">Qəbul edilmiş alış qeydi yoxdur.</p>
          )}
        </section>
      </div>

      <section className="data-table-wrap purchase-lines">
        <h2>Əvvəlki alış qiymətləri</h2>
        {history.length === 0 ? (
          <p className="panel-page-lead">Bu nomenklatura hələ satın alınmayıb.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Tədarükçü</th>
                  <th>Qaimə</th>
                  <th>Status</th>
                  <th className="vendor-th-amount">Miqdar</th>
                  <th className="vendor-th-amount">Vahid alış qiyməti</th>
                  <th className="vendor-th-amount">Sətir məbləği</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={`${entry.purchaseId}-${index}`}>
                    <td>{dateOnly(entry.purchaseDate)}</td>
                    <td>{entry.vendorId || vendorIds[entry.purchaseId] ? <Link className="owner-link" href={`/panel/tedarukculer/${entry.vendorId || vendorIds[entry.purchaseId]}`}>{entry.vendorName ?? "Tədarükçü"}</Link> : entry.vendorName ?? "—"}</td>
                    <td><Link className="owner-link" href={`/panel/maliyye-emeliyyatlari/salinmalar/${entry.purchaseId}`}>{entry.invoiceNumber ?? "Satınalmaya bax"}</Link></td>
                    <td>{purchaseStatusLabel(entry.status)}</td>
                    <td className="vendor-amount">{formatQuantity(entry.quantity)}</td>
                    <td className="vendor-amount">{formatMoney(entry.unitPrice)}</td>
                    <td className="vendor-amount">{formatMoney(entry.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="data-table-wrap purchase-lines">
        <h2>Bu nomenklatura üzrə çıxarışlar</h2>
        {issues.length === 0 ? (
          <p className="panel-page-lead">Hələ bu nomenklatura üzrə çıxarış qeydi yoxdur.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead><tr><th>Tarix</th><th>Material</th><th className="vendor-th-amount">Miqdar</th><th>Qeyd</th></tr></thead>
              <tbody>{issues.map((issue) => (
                <tr key={issue.id}>
                  <td>{dateOnly(issue.transactionDate)}</td>
                  <td><Link className="owner-link" href={`/panel/inventar/materiallar/${issue.nomenclatureId}`}>{issue.nomenclatureName}</Link></td>
                  <td className="vendor-amount">{formatQuantity(issue.quantity)}</td>
                  <td>{issue.notes ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
