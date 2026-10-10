"use client";

import { useEffect, useState } from "react";
import { convertApplication, searchLaborCodeCases, type LaborCodeCase } from "../../lib/api/hr";
import { Modal } from "../Modal";
import { LaborCaseSelect } from "./LaborCaseSelect";
import { hrErrorMessage } from "./shared";

/** Vakansiyaya müraciətin işə qəbul əmrinə çevrilməsi əlavə məlumat (müqavilə müddəti və əsası) tələb edir. */
export function ConvertJobApplicationModal({
  accessToken,
  applicationId,
  applicantName,
  onClose,
  onConverted,
}: {
  accessToken: string;
  applicationId: string;
  applicantName: string;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [cases, setCases] = useState<LaborCodeCase[] | null>(null);
  const [articles, setArticles] = useState<Map<string, LaborCodeCase>>(new Map());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [caseId, setCaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchLaborCodeCases(accessToken, { pageSize: 100 })
      .then((res) => {
        setArticles(new Map(res.data.filter((c) => c.parentId === null).map((c) => [c.id, c])));
        setCases(res.data.filter((c) => c.parentId !== null));
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken]);

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
          <input id="conv-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="conv-end">Müqavilənin bitməsi</label>
          <input id="conv-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-field">
          <span className="cal-label">Müddətli müqavilənin əsası</span>
          <p className="hr-note" style={{ margin: "0 0 8px" }}>
            Azərbaycan Respublikasının Əmək Məcəlləsinin müvafiq maddəsi və bəndi seçilməlidir.
          </p>
          {!cases ? (
            <p className="hr-note">Yüklənir…</p>
          ) : (
            <LaborCaseSelect cases={cases} articles={articles} value={caseId} onChange={setCaseId} />
          )}
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
