"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { dateOnly } from "../../../lib/format";
import {
  cancelPurchase,
  searchPurchases,
  purchaseStatusLabel,
  type SearchPurchasesResult,
  type PurchaseResponse,
} from "../../../lib/api/purchases-client";
import { ApiError } from "../../../lib/api/client";
import { CreatePurchaseModal } from "./CreatePurchaseModal";

const PAGE_SIZE = 12;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function SalinmalarView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchaseResponse[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterSignature = JSON.stringify(searchTerm);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchPurchases(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res: SearchPurchasesResult) => {
        setPurchases(res.purchases);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  if (error && !purchases) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function handleCancel(purchase: PurchaseResponse) {
    if (!window.confirm("Hazırlanan satınalma ləğv edilsin?")) return;
    setCancellingId(purchase.id);
    setError(null);
    try {
      await cancelPurchase(accessToken, purchase.id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (qaimə nömrəsi, alış təsviri…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {canManage && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setCreateOpen(true)}>
            + Yeni salınma
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {!purchases ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table purchase-list-table">
            <thead>
              <tr>
                <th>Qaimə</th>
                <th>Tədarükçi</th>
                <th>Tarix</th>
                <th>Qəbul tarixi</th>
                <th>Status</th>
                <th>Toplam</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7}>Heç bir salınma yoxdur.</td>
                </tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id} className="data-table-row-clickable" tabIndex={0} role="link" aria-label={`${p.invoiceNumber ?? "Satınalma"} detalını aç`} onClick={(event) => { if (!(event.target as HTMLElement).closest("a,button")) router.push(`/panel/maliyye-emeliyyatlari/salinmalar/${p.id}`); }} onKeyDown={(event) => { if (event.key === "Enter" && !(event.target as HTMLElement).closest("a,button")) router.push(`/panel/maliyye-emeliyyatlari/salinmalar/${p.id}`); }}>
                  <td>
                    <Link className="owner-link" href={`/panel/maliyye-emeliyyatlari/salinmalar/${p.id}`}>
                      {p.invoiceNumber ?? "—"}
                    </Link>
                  </td>
                  <td>{p.vendorName ?? "—"}</td>
                  <td>{dateOnly(p.purchaseDate)}</td>
                  <td>{dateOnly(p.receivedOnUtc) ?? "—"}</td>
                  <td>
                    <span className={`panel-role-tag${p.status === 1 ? "" : " panel-role-tag-inactive"}`}>
                      {purchaseStatusLabel(p.status)}
                    </span>
                  </td>
                  <td>
                    <span className="vendor-amount">
                      {p.totalAmount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <div className="data-table-actions">
                      <Link className="panel-btn panel-btn-sm" href={`/panel/maliyye-emeliyyatlari/salinmalar/${p.id}`}>
                        {canManage && p.status === 0 ? "Redaktə" : "Detal"}
                      </Link>
                      {canManage && p.status === 0 && (
                        <button
                          type="button"
                          className="panel-btn panel-btn-sm panel-btn-danger"
                          disabled={cancellingId === p.id}
                          onClick={() => handleCancel(p)}
                        >
                          {cancellingId === p.id ? "Ləğv edilir…" : "Ləğv et"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {totalCount} salınma — səhifə {pageNumber}/{pageCount}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                Əvvəlki
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={pageNumber >= pageCount}
                onClick={() => setPageNumber((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <CreatePurchaseModal
          onClose={() => setCreateOpen(false)}
          onSaved={(purchaseId) => {
            setCreateOpen(false);
            setReloadKey((k) => k + 1);
            if (purchaseId) router.push(`/panel/maliyye-emeliyyatlari/salinmalar/${purchaseId}`);
          }}
        />
      )}
    </div>
  );
}
