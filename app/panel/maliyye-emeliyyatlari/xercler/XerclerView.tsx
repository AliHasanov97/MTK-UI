"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { QueryComparisonType, type QueryFilter } from "../../../lib/api/buildings";
import { createTransaction, createOneTimeServiceExpense } from "../../../lib/api/payments";
import {
  searchContracts,
  getContract,
  contractStatusToOrdinal,
  billingPeriodFromOrdinal,
  type ContractServiceResponse,
} from "../../../lib/api/contracts";
import { searchVendors, type VendorListResult } from "../../../lib/api/vendors";
import { SearchableSelect } from "../../SearchableSelect";

// Recurring costs that already have a vendor/contract behind them (AzərIşıq,
// Sukanal, Azəriqaz subscriptions, etc.) should go through Tədarükçülər instead —
// this list is for the ad-hoc amounts that don't deserve a full vendor record.
const EXPENSE_CATEGORIES = [
  "AzərIşıq (elektrik)",
  "Sukanal (su)",
  "Azəriqaz (qaz)",
  "İstilik",
  "Zibil daşınması",
  "Təmizlik xidməti",
  "Mühafizə / təhlükəsizlik",
  "Lift xidməti",
  "Cari təmir",
  "Əsaslı təmir",
  "Həyətin abadlaşdırılması",
  "Bank xidmət haqqı",
  "Sığorta",
  "Hüquqi / mühasibat xidməti",
  "Ofis xərcləri",
  "Digər",
] as const;

const OTHER_CATEGORY = "Digər";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

type Mode = "contract" | "freeform";

export function XerclerView() {
  const [mode, setMode] = useState<Mode>("contract");
  const canManage = useCanDoEverything();

  return (
    <div className="panel-page">
      <div className="panel-page-head">
        <div>
          <h1>Xərclərin daxil edilməsi</h1>
          <p className="panel-page-lead">
            {mode === "contract"
              ? "Tədarükçünün müqaviləsindəki birdəfəlik xidmətə görə xərc daxil edin — borc və ödəniş avtomatik bağlanır, tədarükçü balansında görünür."
              : "Heç bir müqaviləyə/tədarükçüyə bağlı olmayan kiçik, gözlənilməz xərclər burada qeydə alınır. Təkrarlanan xərclər üçün Tədarükçülər bölməsindən müqavilə yaradın."}
          </p>
        </div>
      </div>

      {!canManage ? (
        <p className="panel-page-lead">
          Bu səhifədə yalnız yeni xərc daxil etmək mümkündür, baxış üçün heç nə yoxdur — keçmiş xərclər
          Tranzaksiyalar bölməsində görünür.
        </p>
      ) : (
        <>
          <div className="ledger-segmented xerc-tab-switch" role="group" aria-label="Xərc növü">
            <button
              type="button"
              aria-pressed={mode === "contract"}
              className={mode === "contract" ? "active" : ""}
              onClick={() => setMode("contract")}
            >
              Müqavilə xidməti
            </button>
            <button
              type="button"
              aria-pressed={mode === "freeform"}
              className={mode === "freeform" ? "active" : ""}
              onClick={() => setMode("freeform")}
            >
              Sərbəst xərc
            </button>
          </div>

          {mode === "contract" ? <ContractServiceExpenseForm /> : <FreeformExpenseForm />}
        </>
      )}
    </div>
  );
}

type OneTimeServiceOption = {
  contractId: string;
  contractNumber: string;
  service: ContractServiceResponse;
};

function ContractServiceExpenseForm() {
  const auth = useAuth();

  const [vendors, setVendors] = useState<VendorListResult[] | null>(null);
  const [vendorId, setVendorId] = useState("");

  // The vendor's active contracts have no UI of their own — a vendor almost
  // always has one, and picking it separately was a pointless extra click.
  // Instead every active contract's OneTime services are fetched and flattened
  // into one picker, keyed by service id (each option remembers its own
  // contractId for submit).
  // null = not loaded yet (still loading, or no vendor picked); [] = loaded, empty.
  const [serviceOptions, setServiceOptions] = useState<OneTimeServiceOption[] | null>(null);
  const [serviceId, setServiceId] = useState("");

  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchVendors(auth.accessToken, { pageSize: 200 })
      .then((res) => setVendors(res.vendors.filter((v) => v.isActive)))
      .catch((err) => setFormError(errorMessage(err)));
  }, [auth]);

  // Cleared state (serviceOptions/service/amount) lives in selectVendor, the
  // only place vendorId changes from user action — this callback only fetches.
  const loadServiceOptions = useCallback(() => {
    if (auth.status !== "authenticated" || !vendorId) return;
    const filters: QueryFilter[] = [
      { columnName: "vendorId", comparison: QueryComparisonType.Equals, value: vendorId },
      { columnName: "status", comparison: QueryComparisonType.Equals, value: contractStatusToOrdinal("Active") },
    ];
    searchContracts(auth.accessToken, { filters, pageSize: 100 })
      .then((res) =>
        Promise.all(res.contracts.map((c) => getContract(auth.accessToken, c.id))),
      )
      .then((fullContracts) => {
        const options = fullContracts.flatMap((c) =>
          c.services
            .filter((s) => s.isActive && billingPeriodFromOrdinal(s.billingPeriod) === "OneTime")
            .map((service) => ({ contractId: c.id, contractNumber: c.number, service })),
        );
        setServiceOptions(options);
      })
      .catch((err) => setFormError(errorMessage(err)));
  }, [auth, vendorId]);

  useEffect(() => {
    loadServiceOptions();
  }, [loadServiceOptions]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  // Multiple active contracts for the same vendor is rare — only then is the
  // contract number worth showing, to tell apart same-named services.
  const multipleContracts = new Set((serviceOptions ?? []).map((o) => o.contractId)).size > 1;

  function selectVendor(value: string) {
    setVendorId(value);
    setServiceOptions(null);
    setServiceId("");
    setAmount("");
  }

  function selectService(id: string) {
    setServiceId(id);
    const option = serviceOptions?.find((o) => o.service.id === id);
    // Xidmətin qiyməti əvvəlcədən bəlli olmaya bilər (0) — onda admin özü yazır.
    setAmount(option && option.service.unitPrice > 0 ? String(option.service.unitPrice) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = serviceOptions?.find((o) => o.service.id === serviceId);
    if (!selected) {
      setFormError("Xidmət seçin.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }

    setSaving(true);
    setFormError(null);
    setSavedMessage(null);
    try {
      await createOneTimeServiceExpense(accessToken, {
        contractId: selected.contractId,
        contractServiceId: selected.service.id,
        amount: numericAmount,
        paymentMethod: "Cash",
        notes: notes || null,
      });
      setSavedMessage(`${selected.service.name} — ${numericAmount.toFixed(2)} ₼ qeydə alındı və ödənildi.`);
      setAmount("");
      setNotes("");
      setServiceId("");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel-card">
      <h4>Müqavilə xidmətinə görə xərc</h4>
      <form onSubmit={handleSubmit}>
        {formError && <p className="form-error">{formError}</p>}
        {savedMessage && <p className="form-success">{savedMessage}</p>}

        <div className="form-field">
          <label htmlFor="expense-vendor">Tədarükçü</label>
          {vendors === null ? (
            <p className="panel-page-lead">Tədarükçülər yüklənir…</p>
          ) : vendors.length === 0 ? (
            <p className="panel-page-lead">
              Aktiv tədarükçü yoxdur — əvvəlcə «Tədarükçülər» bölməsindən biri əlavə edin.
            </p>
          ) : (
            <SearchableSelect
              options={vendors.map((v) => ({ value: v.id, label: v.name, sublabel: v.voen ?? undefined }))}
              value={vendorId}
              onChange={selectVendor}
              placeholder="Tədarükçü seçin…"
            />
          )}
        </div>

        {vendorId && (
          <div className="form-field">
            <label htmlFor="expense-service">Birdəfəlik xidmət</label>
            {serviceOptions === null ? (
              <p className="panel-page-lead">Xidmətlər yüklənir…</p>
            ) : serviceOptions.length === 0 ? (
              <p className="panel-page-lead">
                Bu tədarükçü üçün birdəfəlik xidmət tapılmadı — Müqavilələr bölməsindən əlavə edin.
              </p>
            ) : (
              <select
                id="expense-service"
                value={serviceId}
                onChange={(e) => selectService(e.target.value)}
                required
              >
                <option value="">Xidmət seçin…</option>
                {serviceOptions.map((o) => (
                  <option key={o.service.id} value={o.service.id}>
                    {o.service.name}
                    {o.service.unitPrice > 0 ? ` — ${o.service.unitPrice.toFixed(2)} ₼` : ""}
                    {multipleContracts ? ` (${o.contractNumber})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {serviceId && (
          <>
            <div className="form-field">
              <label htmlFor="expense-amount">Məbləğ (₼)</label>
              <input
                id="expense-amount"
                type="number"
                min={0.01}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="expense-notes">Qeyd (istəyə bağlı)</label>
              <input id="expense-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
                {saving ? "Saxlanılır…" : "Xərci qeyd et"}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}

function FreeformExpenseForm() {
  const auth = useAuth();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  if (auth.status !== "authenticated") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (auth.status !== "authenticated") return;

    const finalCategory = category === OTHER_CATEGORY ? customCategory.trim() : category;
    if (!finalCategory) {
      setFormError("Kateqoriya tələb olunur.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError("Məbləğ 0-dan böyük olmalıdır.");
      return;
    }

    setSaving(true);
    setFormError(null);
    setSavedMessage(null);
    try {
      await createTransaction(auth.accessToken, {
        direction: "Expense",
        category: finalCategory,
        amount: numericAmount,
        description: description || null,
      });
      setSavedMessage(`${finalCategory} — ${numericAmount.toFixed(2)} ₼ qeydə alındı.`);
      setAmount("");
      setDescription("");
      if (category === OTHER_CATEGORY) setCustomCategory("");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel-card">
      <h4>Yeni sərbəst xərc</h4>
      <form onSubmit={handleSubmit}>
        {formError && <p className="form-error">{formError}</p>}
        {savedMessage && <p className="form-success">{savedMessage}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="expense-category">Kateqoriya</label>
            <select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {category === OTHER_CATEGORY && (
            <div className="form-field">
              <label htmlFor="expense-custom-category">Kateqoriya adı</label>
              <input
                id="expense-custom-category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="məs. Domofon xidməti"
                required
              />
            </div>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="expense-amount-freeform">Məbləğ (₼)</label>
          <input
            id="expense-amount-freeform"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="expense-notes-freeform">Qeyd (istəyə bağlı)</label>
          <input id="expense-notes-freeform" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Xərci qeyd et"}
          </button>
        </div>
      </form>
    </section>
  );
}
