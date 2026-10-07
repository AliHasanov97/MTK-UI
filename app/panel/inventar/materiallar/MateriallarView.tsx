"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import {
  NOMENCLATURE_CATEGORIES,
  NOMENCLATURE_CATEGORY_LABELS,
  NOMENCLATURE_CATEGORY_ORDER,
  UNIT_LABELS,
  UNIT_ORDER,
  UNITS,
  categoryFromOrdinal,
  createNomenclature,
  deleteNomenclature,
  getNomenclature,
  searchNomenclatures,
  unitFromOrdinal,
  updateNomenclature,
  type NomenclatureCategoryKey,
  type NomenclatureListItem,
  type NomenclatureResponse,
  type UnitKey,
} from "../../../lib/api/inventory";
import { Modal } from "../../Modal";
import { errorMessage } from "../shared";

const PAGE_SIZE = 10;

export function MateriallarView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [items, setItems] = useState<NomenclatureListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NomenclatureResponse | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

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
    searchNomenclatures(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      sortCriteria: { columnName: "Code", direction: 0 },
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.nomenclatures);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;

  const accessToken = auth.accessToken;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function handleEdit(item: NomenclatureListItem) {
    setWorkingId(item.id);
    setError(null);
    try {
      // The list DTO is light (no description/min stock), so load the full record.
      setEditing(await getNomenclature(accessToken, item.id));
      setFormOpen(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleDelete(item: NomenclatureListItem) {
    if (!window.confirm(`${item.name} silinsin?`)) return;
    setWorkingId(item.id);
    setError(null);
    try {
      await deleteNomenclature(accessToken, item.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  if (error && !items) {
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
          placeholder="Axtar (kod, ad…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {canManage && (
          <button
            type="button"
            className="panel-btn panel-btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Yeni material
          </button>
        )}
      </div>

      {error && (
        <p className="ledger-alert" role="alert">
          {error}
        </p>
      )}

      {!items ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <div className="vendor-head">
            <h3>Material reyestri</h3>
            <span className="vendor-count">{totalCount} qeyd</span>
          </div>
          <div className="owner-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ad</th>
                  <th>Kateqoriya</th>
                  <th>Ölçü vahidi</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nəticə tapılmadı.</td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td className="vendor-cell-vendor">
                      {item.name}
                      {item.description && (
                        <span className="vendor-cell-sub">{item.description}</span>
                      )}
                    </td>
                    <td>{NOMENCLATURE_CATEGORY_LABELS[categoryFromOrdinal(item.category)]}</td>
                    <td>{UNIT_LABELS[unitFromOrdinal(item.unit)]}</td>
                    <td>
                      <span
                        className={`vendor-status ${
                          item.isActive ? "vendor-status-active" : "vendor-status-suspended"
                        }`}
                      >
                        {item.isActive ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td>
                      {canManage && (
                        <div className="data-table-actions">
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm"
                            disabled={workingId === item.id}
                            onClick={() => handleEdit(item)}
                          >
                            Redaktə
                          </button>
                          <button
                            type="button"
                            className="panel-btn panel-btn-sm panel-btn-danger"
                            disabled={workingId === item.id}
                            onClick={() => handleDelete(item)}
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-pagination">
            <span>
              Səhifə {pageNumber}/{pageCount}
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

      {formOpen && (
        <NomenclatureFormModal
          nomenclature={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function NomenclatureFormModal({
  nomenclature,
  onClose,
  onSaved,
}: {
  /** null → yeni material, əks halda redaktə. */
  nomenclature: NomenclatureResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [code, setCode] = useState(nomenclature?.code ?? "");
  const [name, setName] = useState(nomenclature?.name ?? "");
  const [description, setDescription] = useState(nomenclature?.description ?? "");
  const [category, setCategory] = useState<NomenclatureCategoryKey>(
    nomenclature ? categoryFromOrdinal(nomenclature.category) : "Material",
  );
  const [unit, setUnit] = useState<UnitKey>(
    nomenclature ? unitFromOrdinal(nomenclature.unit) : "Piece",
  );
  const [minStockLevel, setMinStockLevel] = useState(
    nomenclature?.minStockLevel != null ? String(nomenclature.minStockLevel) : "",
  );
  const [isActive, setIsActive] = useState(nomenclature?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minLevel = minStockLevel.trim() === "" ? null : Number(minStockLevel);
    if (minLevel != null && (Number.isNaN(minLevel) || minLevel < 0)) {
      setError("Minimum ehtiyat səviyyəsi mənfi ola bilməz.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (nomenclature) {
        await updateNomenclature(accessToken, nomenclature.id, {
          name,
          description: description || null,
          category,
          unit,
          minStockLevel: minLevel,
        });
      } else {
        await createNomenclature(accessToken, {
          code,
          name,
          description: description || null,
          category,
          unit,
          minStockLevel: minLevel,
          isActive,
        });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={nomenclature ? "Materialı redaktə et" : "Yeni material"}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="nom-code">Kod</label>
            <input
              id="nom-code"
              required={!nomenclature}
              disabled={!!nomenclature}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="nom-name">Ad</label>
            <input id="nom-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="nom-category">Kateqoriya</label>
            <select
              id="nom-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as NomenclatureCategoryKey)}
            >
              {NOMENCLATURE_CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {NOMENCLATURE_CATEGORY_LABELS[key]} ({NOMENCLATURE_CATEGORIES[key]})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="nom-unit">Ölçü vahidi</label>
            <select id="nom-unit" value={unit} onChange={(e) => setUnit(e.target.value as UnitKey)}>
              {UNIT_ORDER.map((key) => (
                <option key={key} value={key}>
                  {UNIT_LABELS[key]} ({UNITS[key]})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="nom-min">Minimum ehtiyat</label>
            <input
              id="nom-min"
              type="number"
              min={0}
              step="0.01"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
            />
          </div>
          {!nomenclature && (
            <div className="form-field">
              <label htmlFor="nom-active">Status</label>
              <select
                id="nom-active"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Deaktiv</option>
              </select>
            </div>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="nom-description">Təsvir</label>
          <textarea
            id="nom-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : nomenclature ? "Saxla" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
