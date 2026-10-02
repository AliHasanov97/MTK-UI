"use client";

import { useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { ApiError } from "../../../lib/api/client";
import { createTransaction } from "../../../lib/api/payments";

// Resident apartment/garage charges already post income automatically through
// the payment flow (Ödənişlərin daxil edilməsi) — this list is for income that
// has nothing to do with a charge: common-area rental, fines, interest, etc.
const INCOME_CATEGORIES = [
  "Ümumi sahələrin icarəsi",
  "Avtodayanacaq (qonaq) haqqı",
  "Reklam / antena yerləşdirilməsi",
  "Cərimə",
  "Bank faizi",
  "Sponsorluq / ianə",
  "Satılan materialın dəyəri",
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

export function ElaveGelirlerView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();

  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
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
        direction: "Income",
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
    <div className="panel-page">
      <div className="panel-page-head">
        <div>
          <h1>Əlavə gəlirlərin daxil edilməsi</h1>
          <p className="panel-page-lead">
            Sakinlərin mənzil/qaraj haqqı ödənişləri avtomatik qeydə alınır (Ödənişlərin daxil edilməsi bölməsi).
            Bununla əlaqəsi olmayan əlavə gəlirlər (icarə, cərimə, faiz və s.) burada qeydə alınır. Qeydə alınmış
            gəlirləri Tranzaksiyalar bölməsində görə bilərsiniz.
          </p>
        </div>
      </div>

      {!canManage ? (
        <p className="panel-page-lead">
          Bu səhifədə yalnız yeni gəlir daxil etmək mümkündür, baxış üçün heç nə yoxdur — qeydə alınmış gəlirlər
          Tranzaksiyalar bölməsində görünür.
        </p>
      ) : (
      <section className="panel-card">
        <h4>Yeni gəlir</h4>
        <form onSubmit={handleSubmit}>
          {formError && <p className="form-error">{formError}</p>}
          {savedMessage && <p className="form-success">{savedMessage}</p>}
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="income-category">Kateqoriya</label>
              <select id="income-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {category === OTHER_CATEGORY && (
              <div className="form-field">
                <label htmlFor="income-custom-category">Kateqoriya adı</label>
                <input
                  id="income-custom-category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="məs. Dam üzərində avadanlıq icarəsi"
                  required
                />
              </div>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="income-amount">Məbləğ (₼)</label>
            <input
              id="income-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="income-notes">Qeyd (istəyə bağlı)</label>
            <input id="income-notes" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
              {saving ? "Saxlanılır…" : "Gəliri qeyd et"}
            </button>
          </div>
        </form>
      </section>
      )}
    </div>
  );
}
