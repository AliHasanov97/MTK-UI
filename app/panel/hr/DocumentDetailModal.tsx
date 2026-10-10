"use client";

import { useEffect, useState } from "react";
import {
  APPLICATION_ATTACHMENT_FK,
  APPLICATION_KINDS,
  DELETABLE_ORDERS,
  DISCIPLINARY_TYPES,
  ORDER_ATTACHMENT_FK,
  ORDER_FOR_APPLICATION,
  ORDER_KINDS,
  convertApplication,
  deleteApplication,
  deleteOrder,
  downloadApplicationPdf,
  downloadOrderPdf,
  getApplicationDetail,
  getOrderDetail,
  searchLaborCodeCases,
  optionLabel,
  type ApplicationKind,
  type DocumentDetail,
  type LaborCodeCase,
  type OrderKind,
} from "../../lib/api/hr";
import { formatDateTime } from "../../lib/format";
import { Modal } from "../Modal";
import { ConvertJobApplicationModal } from "./ConvertJobApplicationModal";
import { HrSignedDocuments } from "./HrSignedDocuments";
import { formatDate, hrErrorMessage } from "./shared";

export type DocTarget =
  | { type: "application"; kind: ApplicationKind; id: string }
  | { type: "order"; kind: OrderKind; id: string };

const LABELS: Record<string, string> = {
  employee: "İşçi",
  currentJob: "Cari vəzifə",
  newJob: "Yeni vəzifə",
  job: "Vəzifə",
  jobApplication: "Vakansiyaya müraciət",
  laborCodeCase: "Müqavilənin əsası",
  orderExecutionSupervisor: "Əmrin icrasına nəzarət edən",
  startDate: "Başlanğıc tarixi",
  endDate: "Bitmə tarixi",
  setDate: "Tarix",
  returnDate: "İşə qayıtma tarixi",
  returnToWorkDate: "İşə çıxma tarixi",
  requestedDays: "Gün sayı",
  totalRequestedDays: "Gün sayı",
  vacationDays: "Məzuniyyət günləri",
  compensatedDays: "Kompensasiya günləri",
  workYearStart: "İş ilinin başlanğıcı",
  workYearEnd: "İş ilinin sonu",
  notes: "Qeyd",
  reason: "Səbəb",
  currentEmploymentType: "Cari iş rejimi",
  newEmploymentType: "Yeni iş rejimi",
  bonusQuantity: "Mükafat məbləği",
  salaryMonth: "Maaş ayı",
  salaryYear: "Maaş ili",
  district: "Rayon / məhkəmə",
  judgementNo: "Qərar №",
  judgementDate: "Qərar tarixi",
  percentageSalary: "Tutulma faizi",
  stateFee: "Dövlət rüsumu",
  creditor: "Alıcı (kreditor)",
  debt: "Borc",
  disciplinaryType: "İntizam növü",
  name: "Ad",
  surname: "Soyad",
  fathersName: "Ata adı",
  gender: "Cins",
  telephone: "Telefon",
  homeTelephoneNumber: "Ev telefonu",
  address: "Ünvan",
  createdBy: "Yaradan",
  createdAt: "Yaradılma tarixi",
  updatedAt: "Son dəyişiklik",
};

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const WIDE_KEYS = new Set(["notes", "reason", "address", "laborCodeCase"]);
// Başlıqda göstərilən və ya texniki sahələr (siyahıda təkrar göstərilmir)
const HIDDEN_KEYS = new Set(["id", "applicationNumber", "orderNumber", "status", "createdAt", "updatedAt", "createdBy"]);

const ENUM_TEXT: Record<string, string> = {
  Male: "Kişi",
  Female: "Qadın",
  FullTime: "Tam ştat",
  HalfTime: "Yarım ştat",
};

/** Ərizənin əlaqəli əmrini göstərən sahə (order, vacationOrder, orderForChangeOfPosition …); nəzarətçi əmr sahəsi deyil. */
const isOrderRefKey = (k: string) => /order/i.test(k) && !/supervisor/i.test(k);
const key_has_label = (k: string) => k in LABELS;

const isRef = (v: unknown): v is { id: string; name: string } =>
  typeof v === "object" && v !== null && "id" in v && "name" in v;

function formatValue(key: string, value: unknown): string {
  if (isRef(value)) return value.name;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return key === "createdAt" || key === "updatedAt" ? formatDateTime(value) : formatDate(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
    return ENUM_TEXT[value] ?? value;
  }
  if (typeof value === "number") {
    switch (key) {
      case "bonusQuantity":
      case "stateFee":
      case "debt":
        return `${value} ₼`;
      case "percentageSalary":
        return `${value}%`;
      case "salaryMonth":
        return MONTHS[value - 1] ?? String(value);
      case "disciplinaryType":
        return optionLabel(DISCIPLINARY_TYPES, value);
      case "requestedDays":
      case "totalRequestedDays":
      case "vacationDays":
      case "compensatedDays":
        return `${value} gün`;
      default:
        return String(value);
    }
  }
  return String(value);
}

type Related = { target: DocTarget; label: string };

/** Müqavilənin əsası: maddə və bənd başlıqda, bəndin tam mətni altında. */
function LaborCaseBlock({ accessToken, caseId, fallback }: { accessToken: string; caseId: string; fallback: string }) {
  const [info, setInfo] = useState<{ item: LaborCodeCase; article?: LaborCodeCase } | null>(null);

  useEffect(() => {
    searchLaborCodeCases(accessToken, { pageSize: 100 })
      .then((res) => {
        const item = res.data.find((c) => c.id === caseId);
        if (item) setInfo({ item, article: res.data.find((c) => c.id === item.parentId) });
      })
      .catch(() => {
        /* əlavə məlumat; alınmazsa sadə mətn göstərilir */
      });
  }, [accessToken, caseId]);

  if (!info) return <span className="hr-kv-value">{fallback}</span>;
  return (
    <div className="lc-detail">
      <div className="lc-detail-head">
        <span className="lc-badge">{info.item.code})</span>
        <strong>
          Əmək Məcəlləsi{info.article ? `, maddə ${info.article.code}` : ""} · bənd {info.item.code})
        </strong>
      </div>
      {info.article && <span className="lc-detail-article">{info.article.name}</span>}
      <p className="lc-detail-text">{info.item.name}</p>
    </div>
  );
}

/** Ərizə / əmrin bütün məlumatı, sənəd (PDF) yükləmə və əlaqəli əməliyyatlar (əmrə çevir, sil, əlaqəli sənədə keç). */
export function DocumentDetailModal({
  accessToken,
  target,
  onClose,
  onChanged,
}: {
  accessToken: string;
  target: DocTarget;
  onClose: () => void;
  /** Siyahının yenilənməsi üçün (status, silmə, əmrə çevirmə) */
  onChanged: () => void;
}) {
  const [stack, setStack] = useState<DocTarget[]>([target]);
  const current = stack[stack.length - 1];
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pdf" | "convert" | "delete" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [converting, setConverting] = useState(false);
  const [signedCount, setSignedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const request =
      current.type === "application"
        ? getApplicationDetail(accessToken, current.kind, current.id)
        : getOrderDetail(accessToken, current.kind, current.id);
    request
      .then((res) => {
        if (!cancelled) {
          setDetail(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(hrErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, current, reloadKey]);

  function open(next: DocTarget) {
    setSignedCount(null);
    setDetail(null);
    setError(null);
    setNotice(null);
    setStack((s) => [...s, next]);
  }

  function back() {
    setSignedCount(null);
    setDetail(null);
    setError(null);
    setNotice(null);
    setStack((s) => s.slice(0, -1));
  }

  const isApplication = current.type === "application";
  const kindLabel = isApplication ? APPLICATION_KINDS[current.kind].label : ORDER_KINDS[current.kind].label;
  const number = detail ? (isApplication ? detail.applicationNumber : detail.orderNumber) : null;
  const status = detail && typeof detail.status === "string" ? detail.status : null;
  const pending = isApplication && status === "PendingApproval";
  // İmzalanmış nüsxə yüklənibsə, sənədi yenidən generasiya etməyə ehtiyac yoxdur
  const hasSigned = (signedCount ?? 0) > 0;
  const canPdf = !hasSigned && (isApplication || ORDER_KINDS[current.kind as OrderKind].pdf);
  const canDelete = isApplication ? pending : DELETABLE_ORDERS.includes(current.kind as OrderKind);

  // Əlaqəli sənədlər
  const related: Related[] = [];
  if (detail) {
    if (current.type === "application") {
      const orderRef = Object.entries(detail).find(([k, v]) => isOrderRefKey(k) && isRef(v));
      if (orderRef) {
        related.push({
          target: { type: "order", kind: ORDER_FOR_APPLICATION[current.kind], id: (orderRef[1] as { id: string }).id },
          label: `Əmr №${(orderRef[1] as { name: string }).name}`,
        });
      }
    } else {
      const appKind = (Object.keys(ORDER_FOR_APPLICATION) as ApplicationKind[]).find(
        (k) => ORDER_FOR_APPLICATION[k] === current.kind,
      );
      const refValue =
        (isRef(detail.application) && detail.application) ||
        (isRef(detail.jobApplication) && detail.jobApplication) ||
        null;
      const idValue =
        refValue?.id ??
        (Object.entries(detail).find(([k, v]) => /application.*id$/i.test(k) && typeof v === "string")?.[1] as
          | string
          | undefined);
      if (appKind && idValue) {
        related.push({
          target: { type: "application", kind: appKind, id: idValue },
          label: refValue ? `Ərizə №${refValue.name}` : "Əlaqəli ərizə",
        });
      }
    }
  }

  const fields = detail
    ? Object.entries(detail).filter(
        ([k, v]) =>
          !HIDDEN_KEYS.has(k) &&
          v !== null &&
          v !== undefined &&
          v !== "" &&
          !(typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v)) &&
          !(isRef(v) && (isOrderRefKey(k) || k === "application" || k === "jobApplication")) &&
          // Etiketi olmayan (texniki) sahələr istifadəçiyə göstərilmir
          key_has_label(k),
      )
    : [];

  async function handlePdf() {
    setBusy("pdf");
    setError(null);
    try {
      if (current.type === "application") await downloadApplicationPdf(accessToken, current.kind, current.id);
      else await downloadOrderPdf(accessToken, current.kind, current.id);
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function afterConvert() {
    setConverting(false);
    setNotice("Ərizə əmrə çevrildi.");
    setReloadKey((k) => k + 1);
    onChanged();
  }

  async function handleConvert() {
    if (current.type !== "application") return;
    if (current.kind === "JobApplication") {
      setConverting(true);
      return;
    }
    setBusy("convert");
    setError(null);
    try {
      await convertApplication(accessToken, current.kind, current.id);
      await afterConvert();
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    const what = isApplication ? "Ərizə" : "Əmr";
    if (!window.confirm(`${what} №${number ?? ""} silinsin?`)) return;
    setBusy("delete");
    setError(null);
    try {
      if (current.type === "application") await deleteApplication(accessToken, current.kind, current.id);
      else await deleteOrder(accessToken, current.kind, current.id);
      onChanged();
      if (stack.length > 1) back();
      else onClose();
    } catch (err) {
      setError(hrErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const title = `${isApplication ? "Ərizə" : "Əmr"}${number !== null ? ` №${number}` : ""} · ${kindLabel}`;

  return (
    <>
      {!converting && (
      <Modal title={title} wide onClose={onClose}>
        {stack.length > 1 && (
          <button type="button" className="panel-btn panel-btn-sm" style={{ marginBottom: 12 }} onClick={back}>
            ← Geri
          </button>
        )}

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="cal-notice">{notice}</p>}

        {!detail ? (
          !error && <p className="panel-page-lead">Yüklənir…</p>
        ) : (
          <>
            <div className="doc-head">
              <span className="doc-kind">{kindLabel}</span>
              {isApplication && (
                <span className={`panel-role-tag ${pending ? "panel-role-tag-warn" : "panel-role-tag-good"}`}>
                  {pending ? "Gözləmədə" : "Əmrə çevrilib"}
                </span>
              )}
              <span className="doc-meta">
                {typeof detail.createdAt === "string" && formatDateTime(detail.createdAt)}
                {isRef(detail.createdBy) && ` · ${detail.createdBy.name}`}
              </span>
            </div>

            <div className="hr-kv">
              {fields.map(([key, value]) => (
                <div key={key} className={`hr-kv-item ${WIDE_KEYS.has(key) ? "hr-kv-item-wide" : ""}`}>
                  <span className="hr-kv-label">{LABELS[key] ?? key}</span>
                  {key === "laborCodeCase" && isRef(value) ? (
                    <LaborCaseBlock accessToken={accessToken} caseId={value.id} fallback={formatValue(key, value)} />
                  ) : (
                    <span className="hr-kv-value">{formatValue(key, value)}</span>
                  )}
                </div>
              ))}
              {fields.length === 0 && <p className="panel-page-lead">Əlavə məlumat yoxdur.</p>}
            </div>

            {related.length > 0 && (
              <div className="doc-related">
                <span className="hr-kv-label">Əlaqəli sənəd</span>
                {related.map((r) => (
                  <button key={r.label} type="button" className="panel-btn panel-btn-sm" onClick={() => open(r.target)}>
                    {r.label} →
                  </button>
                ))}
              </div>
            )}

            <HrSignedDocuments
              key={`${current.type}-${current.id}`}
              accessToken={accessToken}
              fkColumn={current.type === "application" ? APPLICATION_ATTACHMENT_FK[current.kind] : ORDER_ATTACHMENT_FK[current.kind]}
              recordId={current.id}
              onCountChange={setSignedCount}
            />

            <div className="doc-actions">
              {canDelete && (
                <button
                  type="button"
                  className="panel-btn panel-btn-danger doc-actions-left"
                  disabled={busy !== null}
                  onClick={handleDelete}
                >
                  {busy === "delete" ? "Silinir…" : "Sil"}
                </button>
              )}
              {pending && (
                <button type="button" className="panel-btn" disabled={busy !== null} onClick={handleConvert}>
                  {busy === "convert" ? "Çevrilir…" : "Əmrə çevir"}
                </button>
              )}
              {canPdf && (
                <button type="button" className="panel-btn panel-btn-primary" disabled={busy !== null} onClick={handlePdf}>
                  {busy === "pdf" ? "Hazırlanır…" : "Sənədi yüklə (PDF)"}
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
      )}

      {converting && current.type === "application" && current.kind === "JobApplication" && detail && (
        <ConvertJobApplicationModal
          accessToken={accessToken}
          applicationId={current.id}
          applicantName={`${detail.surname ?? ""} ${detail.name ?? ""}`.trim() || "Namizəd"}
          onClose={() => setConverting(false)}
          onConverted={afterConvert}
        />
      )}
    </>
  );
}
