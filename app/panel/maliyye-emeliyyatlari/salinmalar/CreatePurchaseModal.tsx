"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError } from "../../../lib/api/client";
import { searchNomenclatures, type NomenclatureListItem } from "../../../lib/api/inventory";
import {
  createPurchase,
  updatePurchase,
  type CreatePurchaseRequest,
  type PurchaseResponse,
} from "../../../lib/api/purchases-client";
import { searchVendors, type VendorListResult } from "../../../lib/api/vendors";
import { Modal } from "../../Modal";

type PurchaseLineDraft = {
  nomenclatureId: string;
  nomenclatureSearch: string;
  quantity: string;
  unitPrice: string;
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${error.status}): ${error.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

function emptyLine(): PurchaseLineDraft {
  return { nomenclatureId: "", nomenclatureSearch: "", quantity: "", unitPrice: "" };
}

const money = (amount: number) =>
  `${amount.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

export function CreatePurchaseModal({
  purchase,
  onClose,
  onSaved,
}: {
  purchase?: PurchaseResponse;
  onClose: () => void;
  onSaved: (purchaseId: string) => void;
}) {
  const auth = useAuth();
  const [vendors, setVendors] = useState<VendorListResult[] | null>(purchase ? [] : null);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureListItem[] | null>(null);
  const [vendorId, setVendorId] = useState(purchase?.vendorId ?? "");
  const [purchaseDate, setPurchaseDate] = useState(
    () => purchase?.purchaseDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState(purchase?.note ?? "");
  const [lines, setLines] = useState<PurchaseLineDraft[]>(() =>
    purchase?.lines?.map((line) => ({
      nomenclatureId: line.nomenclatureId,
      nomenclatureSearch: [line.nomenclatureCode, line.nomenclatureName]
        .filter(Boolean)
        .join(" — "),
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
    })) ?? [],
  );
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const nomenclatureInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    if (!purchase) {
      searchVendors(auth.accessToken, { pageSize: 200 })
        .then((result) => setVendors(result.vendors.filter((vendor) => vendor.isActive)))
        .catch((err: unknown) => setError(errorMessage(err)));
    }

    searchNomenclatures(auth.accessToken, { pageSize: 500 })
      .then((result) => setNomenclatures(result.nomenclatures.filter((item) => item.isActive)))
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [auth, purchase]);

  useEffect(() => {
    if (activeLine === null) return;
    const updatePickerPosition = () => {
      const input = nomenclatureInputs.current[activeLine];
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 280), viewportWidth - 16);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const below = viewportHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const openBelow = below >= 180 || below >= above;
      const available = Math.max(80, (openBelow ? below : above) - 8);
      const maxHeight = Math.min(360, available);
      const top = openBelow ? rect.bottom + 4 : Math.max(8, rect.top - maxHeight - 4);
      setPickerPosition({ top, left, width, maxHeight });
    };

    updatePickerPosition();
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);
    return () => {
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [activeLine, lines.length]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;
  const total = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    return sum + (Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0);
  }, 0);

  function updateLine(index: number, patch: Partial<PurchaseLineDraft>) {
    setLines((current) => current.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line,
    ));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendorId) {
      setError("Tədarükçü seçin.");
      return;
    }
    if (!purchaseDate) {
      setError("Satınalma tarixini qeyd edin.");
      return;
    }
    if (lines.length === 0) {
      setError("Ən azı bir sətir əlavə edin.");
      return;
    }

    const requestLines = lines.map((line) => ({
      nomenclatureId: line.nomenclatureId,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    }));
    if (requestLines.some((line) =>
      !line.nomenclatureId ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      !Number.isFinite(line.unitPrice) ||
      line.unitPrice < 0,
    )) {
      setError("Hər sətirdə nomenklatura, müsbət miqdar və düzgün qiymət seçin.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const request: CreatePurchaseRequest = {
        vendorId,
        purchaseDate,
        note: note.trim() || null,
        lines: requestLines,
      };
      if (purchase) {
        await updatePurchase(accessToken, purchase.id, request);
        onSaved(purchase.id);
      } else {
        const purchaseId = await createPurchase(accessToken, request);
        onSaved(purchaseId);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={purchase ? "Satınalmanı redaktə et" : "Yeni satınalma"}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}

        {purchase ? (
          <div className="form-field">
            <label>Tədarükçü</label>
            <div className="purchase-vendor-readonly">{purchase.vendorName ?? "—"}</div>
          </div>
        ) : (
          <div className="form-field">
            <label htmlFor="purchase-vendor">Tədarükçü</label>
            {vendors === null ? (
              <p className="panel-page-lead">Tədarükçülər yüklənir…</p>
            ) : vendors.length === 0 ? (
              <p className="panel-page-lead">
                Aktiv tədarükçü yoxdur — əvvəlcə Tədarükçülər bölməsindən əlavə edin.
              </p>
            ) : (
              <select
                id="purchase-vendor"
                required
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
              >
                <option value="">Tədarükçü seçin…</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="purchase-date">Satınalma tarixi</label>
            <input
              id="purchase-date"
              type="date"
              required
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="purchase-note">Qeyd</label>
          <textarea id="purchase-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        <section className="purchase-entry-lines" aria-label="Satınalma sətirləri">
          <div className="form-section-head">
            <div>
              <h3>Satınalma sətirləri</h3>
              <p className="panel-page-lead">Məhsulları cədvələ əlavə edib miqdar və qiyməti daxil edin.</p>
            </div>
            <button
              type="button"
              className="panel-btn panel-btn-sm"
              disabled={!nomenclatures}
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              + Sətir əlavə et
            </button>
          </div>

          {nomenclatures === null ? (
            <p className="panel-page-lead">Nomenklaturalar yüklənir…</p>
          ) : (
            <div className="purchase-entry-table-wrap">
              <table className="data-table purchase-entry-table">
                <thead>
                  <tr>
                    <th>Nomenklatura</th>
                    <th className="vendor-th-amount">Miqdar</th>
                    <th className="vendor-th-amount">Vahid qiymət</th>
                    <th className="vendor-th-amount">Məbləğ</th>
                    <th aria-label="Sətir əməliyyatı"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const queryParts = line.nomenclatureSearch
                      .split("—")
                      .map((part) => part.trim().toLowerCase())
                      .filter(Boolean);
                    const query = queryParts.at(-1) ?? "";
                    const matches = nomenclatures
                      .filter((item) =>
                        !query ||
                        item.name.toLowerCase().includes(query) ||
                        item.code.toLowerCase().includes(query),
                      );
                    const maxVisibleOptions = Math.max(1, Math.floor(((pickerPosition?.maxHeight ?? 360) - 42) / 42));
                    const filteredNomenclatures = matches.slice(0, maxVisibleOptions);
                    const lineTotal = Number(line.quantity) * Number(line.unitPrice);

                    return (
                      <tr key={index}>
                        <td>
                          <div className="purchase-nomenclature-picker">
                            <input
                              type="search"
                              role="combobox"
                              aria-label={`Sətir ${index + 1} nomenklaturası`}
                              aria-expanded={activeLine === index}
                              aria-controls={`nomenclature-options-${index}`}
                              autoComplete="off"
                              placeholder="Ad və ya kod ilə axtar…"
                              value={line.nomenclatureSearch}
                              ref={(element) => { nomenclatureInputs.current[index] = element; }}
                              onFocus={() => { setPickerPosition(null); setActiveLine(index); }}
                              onBlur={() => { setActiveLine(null); setPickerPosition(null); }}
                              onChange={(event) => {
                                updateLine(index, {
                                  nomenclatureId: "",
                                  nomenclatureSearch: event.target.value,
                                });
                                setActiveLine(index);
                              }}
                            />
                            {activeLine === index && pickerPosition && createPortal(
                              <div
                                className="purchase-nomenclature-options"
                                id={`nomenclature-options-${index}`}
                                role="listbox"
                                style={{ position: "fixed", top: pickerPosition.top, left: pickerPosition.left, width: pickerPosition.width, maxHeight: pickerPosition.maxHeight, zIndex: 1100 }}
                              >
                                {filteredNomenclatures.length > 0 ? filteredNomenclatures.map((item) => (
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={line.nomenclatureId === item.id}
                                    key={item.id}
                                    onPointerDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                      updateLine(index, {
                                        nomenclatureId: item.id,
                                        nomenclatureSearch: `${item.code} — ${item.name}`,
                                      });
                                      setActiveLine(null);
                                    }}
                                  >
                                    <strong>{item.name}</strong>
                                    <span>{item.code}</span>
                                  </button>
                                )) : (
                                  <p>Nomenklatura tapılmadı.</p>
                                )}
                                {matches.length > filteredNomenclatures.length && (
                                  <p className="purchase-options-more">Daha çox nəticə üçün axtarışı dəqiqləşdirin.</p>
                                )}
                              </div>,
                              document.body,
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            className="purchase-line-number"
                            aria-label={`Sətir ${index + 1} miqdarı`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={line.quantity}
                            onChange={(event) => updateLine(index, { quantity: event.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="purchase-line-number"
                            aria-label={`Sətir ${index + 1} vahid qiyməti`}
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={line.unitPrice}
                            onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                          />
                        </td>
                        <td className="vendor-amount">
                          {Number.isFinite(lineTotal) ? money(lineTotal) : "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            aria-label={`Sətir ${index + 1}-i sil`}
                            onClick={() => {
                              setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
                              setActiveLine(null);
                            }}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {lines.length === 0 && (
                    <tr><td colSpan={5}>Satınalmaya əlavə edilmiş nomenklatura yoxdur.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3}>Yekun məbləğ</th>
                    <th className="vendor-amount">{money(total)}</th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>Ləğv et</button>
          <button
            type="submit"
            className="panel-btn panel-btn-primary"
            disabled={saving || (!purchase && (vendors === null || vendors.length === 0)) || nomenclatures === null}
          >
            {saving ? "Saxlanılır…" : purchase ? "Dəyişiklikləri saxla" : "Satınalmanı yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
