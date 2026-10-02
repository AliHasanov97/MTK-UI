"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../lib/auth/roles";
import { ApiError } from "../../lib/api/client";
import {
  CONTRACT_STATUS_LABELS,
  contractStatusFromOrdinal,
  createContract,
  searchContracts,
  type ContractListItem,
} from "../../lib/api/contracts";
import { searchVendors, type VendorListResult } from "../../lib/api/vendors";
import { Modal } from "../Modal";
import { SearchableSelect } from "../SearchableSelect";

const PAGE_SIZE = 10;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const dateOnly = (iso: string) => iso.slice(0, 10);

function nextYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function MuqavilelerView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new search term restarts pagination from the first page.
  const filterSignature = JSON.stringify(searchTerm);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    searchContracts(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setContracts(res.contracts);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;

  if (error && !contracts) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (müqavilə nömrəsi, qeyd…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {canManage && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setCreateOpen(true)}>
            + Yeni müqavilə
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {!contracts ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nömrə</th>
                <th>Tədarükçü</th>
                <th>Müddət</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={5}>Nəticə tapılmadı.</td>
                </tr>
              )}
              {contracts.map((c) => {
                const status = contractStatusFromOrdinal(c.status);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link className="owner-link" href={`/panel/muqavileler/${c.id}`}>
                        {c.number}
                      </Link>
                    </td>
                    <td>{c.vendorName ?? "—"}</td>
                    <td>
                      {dateOnly(c.startDate)} — {dateOnly(c.endDate)}
                    </td>
                    <td>
                      <span className={`panel-role-tag${status === "Active" && !c.isExpired ? "" : " panel-role-tag-inactive"}`}>
                        {CONTRACT_STATUS_LABELS[status]}
                      </span>
                      {c.isExpired && status === "Active" && (
                        <>
                          {" "}
                          <span className="panel-role-tag panel-role-tag-inactive">Müddəti bitib</span>
                        </>
                      )}
                    </td>
                    <td>
                      <div className="data-table-actions">
                        <Link
                          className="panel-btn panel-btn-sm"
                          style={{ display: "inline-block" }}
                          href={`/panel/muqavileler/${c.id}`}
                        >
                          Aç
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {totalCount} müqavilə — səhifə {pageNumber}/{pageCount}
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
        <CreateContractModal
          onClose={() => setCreateOpen(false)}
          onSaved={(contractId) => {
            setCreateOpen(false);
            setReloadKey((k) => k + 1);
            // Yeni müqavilə "Hazırlanır" statusunda yaranır — istifadəçi dərhal
            // xidmətləri əlavə edib aktivləşdirə bilsin deyə detal səhifəsinə keçirik.
            if (contractId) router.push(`/panel/muqavileler/${contractId}`);
          }}
        />
      )}
    </div>
  );
}

function CreateContractModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (contractId: string) => void;
}) {
  const auth = useAuth();
  const [vendors, setVendors] = useState<VendorListResult[] | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [number, setNumber] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(nextYear);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchVendors(auth.accessToken, { pageSize: 200 })
      .then((res) => setVendors(res.vendors.filter((v) => v.isActive)))
      .catch((err) => setError(errorMessage(err)));
  }, [auth]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) {
      setError("Tədarükçü seçin.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const contractId = await createContract(accessToken, {
        number,
        vendorId,
        startDate,
        endDate,
        note: note || null,
      });
      onSaved(contractId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni müqavilə" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="contract-number">Müqavilə nömrəsi</label>
          <input
            id="contract-number"
            required
            placeholder="2026/045"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="contract-vendor">Tədarükçü</label>
          {vendors === null ? (
            <p className="panel-page-lead">Tədarükçülər yüklənir…</p>
          ) : vendors.length === 0 ? (
            <p className="panel-page-lead">
              Aktiv tədarükçü yoxdur — əvvəlcə «Tədarükçülər» bölməsindən biri əlavə edin.
            </p>
          ) : (
            <SearchableSelect
              options={vendors.map((v) => ({
                value: v.id,
                label: v.name,
                sublabel: v.voen ?? undefined,
              }))}
              value={vendorId}
              onChange={setVendorId}
              placeholder="Tədarükçü seçin…"
            />
          )}
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="contract-start">Başlanğıc tarixi</label>
            <input
              id="contract-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="contract-end">Bitmə tarixi</label>
            <input
              id="contract-end"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="contract-note">Qeyd</label>
          <textarea id="contract-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button
            type="submit"
            className="panel-btn panel-btn-primary"
            disabled={saving || !vendors || vendors.length === 0}
          >
            {saving ? "Saxlanılır…" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
