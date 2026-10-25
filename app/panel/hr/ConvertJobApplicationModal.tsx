"use client";

import { useState } from "react";
import { convertApplication, type LaborCodeCase } from "../../lib/api/hr";
import { Modal } from "../Modal";
import { LaborCaseSelect } from "./LaborCaseSelect";
import { hrErrorMessage } from "./shared";
import { DateInput } from "../../components/DateInput";

/** Vakansiyaya müraciətin işə qəbul əmrinə çevrilməsi əlavə məlumat (müqavilə müddəti və əsası) tələb edir. */
export function ConvertJobApplicationModal({
  accessToken,
  applicationId,
  applicantName,
  data,
  onClose,
  onConverted,
}: {
  accessToken: string;
  applicationId: string;
  applicantName: string;
  /** Əmək Məcəlləsi maddələri — modal açılmazdan əvvəl yüklənir. */
  data: LaborCodeCase[];
  onClose: () => void;
  onConverted: () => void;
}) {
  const articles = new Map(data.filter((c) => c.parentId === null).map((c) => [c.id, c]));
  const cases = data.filter((c) => c.parentId !== null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [caseId, setCaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) {
      setError("Müddətli müqavilənin əsası seçilməlidir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await convertApplication(accessToken, "JobApplication", applicationId, {
        startDate,
        endDate,
        laborCodeCaseId: caseId,
      });
      onConverted();
    } catch (err) {
      setError(hrErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={`${applicantName} — işə qəbul əmri`} wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="conv-start">Müqavilənin başlanğıcı</label>
          <DateInput id="conv-start" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="conv-end">Müqavilənin bitməsi</label>
          <DateInput id="conv-end" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-field">
          <span className="cal-label">Müddətli müqavilənin əsası</span>
          <p className="hr-note" style={{ margin: "0 0 8px" }}>
            Azərbaycan Respublikasının Əmək Məcəlləsinin müvafiq maddəsi və bəndi seçilməlidir.
          </p>
          <LaborCaseSelect cases={cases} articles={articles} value={caseId} onChange={setCaseId} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Əmrə çevir"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
