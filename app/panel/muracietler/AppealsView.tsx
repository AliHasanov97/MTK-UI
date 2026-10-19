"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { hasAnyRole, ROLES } from "../../lib/auth/roleConstants";
import { QueryComparisonType, SortDirection, type QueryFilter } from "../../lib/api/buildings";
import {
  searchAppeals,
  AppealStatus,
  AppealCategory,
  AppealPriority,
  APPEAL_STATUS_LABELS,
  APPEAL_CATEGORY_LABELS,
  APPEAL_PRIORITY_LABELS,
  appealCategoryLabel,
  appealPriorityLabel,
  appealPriorityClass,
  appealStatusClass,
  appealStatusLabel,
  type SearchAppealsResult,
} from "../../lib/api/appeals";
import { CreateAppealModal } from "./CreateAppealModal";
import "./appeals.css";

const PAGE_SIZE = 15;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu bölməyə icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const STATUS_TABS = Object.values(AppealStatus).filter((v): v is AppealStatus => typeof v === "number");

export function AppealsView() {
  const auth = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<AppealStatus | "">("");
  const [category, setCategory] = useState<AppealCategory | "">("");
  const [priority, setPriority] = useState<AppealPriority | "">("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchAppealsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const isStaff = auth.status === "authenticated" && hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    let cancelled = false;

    const filters: QueryFilter[] = [];
    if (status !== "") filters.push({ columnName: "Status", comparison: QueryComparisonType.Equals, value: status });
    if (category !== "") filters.push({ columnName: "Category", comparison: QueryComparisonType.Equals, value: category });
    if (priority !== "") filters.push({ columnName: "Priority", comparison: QueryComparisonType.Equals, value: priority });

    searchAppeals(auth.accessToken, {
      filters: filters.length ? filters : null,
      sortCriteria: { columnName: "CreatedAt", direction: SortDirection.Descending },
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [auth, status, category, priority, page]);

  if (auth.status !== "authenticated") return null;

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  const hasFilters = status !== "" || category !== "" || priority !== "";
  const resetPage = () => setPage(1);

  return (
    <div className="panel-page">
      <div className="ap-head">
        <div>
          <h1>{isStaff ? "Müraciətlər" : "Mənim müraciətlərim"}</h1>
          <p className="panel-page-lead">
            {isStaff
              ? "Sakinlərin müraciətlərini qəbul edin, həll edin."
              : "Problem, təklif və suallarınızı buradan göndərin və gedişatını izləyin."}
          </p>
        </div>
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
          + Yeni müraciət
        </button>
      </div>

      <div className="ap-tabs" role="tablist" aria-label="Status">
        <button type="button" className={status === "" ? "ap-tab active" : "ap-tab"} onClick={() => { setStatus(""); resetPage(); }}>
          Hamısı
        </button>
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            className={status === s ? "ap-tab active" : "ap-tab"}
            onClick={() => {
              setStatus(s);
              resetPage();
            }}
          >
            {APPEAL_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="panel-toolbar">
        <select
          className="panel-select"
          aria-label="Kateqoriya"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value === "" ? "" : (Number(e.target.value) as AppealCategory));
            resetPage();
          }}
        >
          <option value="">Bütün kateqoriyalar</option>
          {Object.entries(APPEAL_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="panel-select"
          aria-label="Prioritet"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value === "" ? "" : (Number(e.target.value) as AppealPriority));
            resetPage();
          }}
        >
          <option value="">Bütün prioritetlər</option>
          {Object.entries(APPEAL_PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            className="panel-btn"
            onClick={() => {
              setStatus("");
              setCategory("");
              setPriority("");
              resetPage();
            }}
          >
            Süzgəcləri təmizlə
          </button>
        )}
      </div>

      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {!result ? (
        !error && <p className="panel-page-lead">Yüklənir…</p>
      ) : result.appeals.length === 0 ? (
        <div className="data-table-wrap ap-empty">
          <strong>{hasFilters ? "Bu süzgəclərə uyğun müraciət yoxdur" : "Hələ müraciət yoxdur"}</strong>
          {hasFilters
            ? "Süzgəcləri dəyişin və ya təmizləyin."
            : isStaff
              ? "Sakinlər müraciət göndərəndə burada görünəcək."
              : "Ehtiyacınız olanda ilk müraciətinizi göndərin."}
          {!hasFilters && !isStaff && (
            <div>
              <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
                İlk müraciəti göndər
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Müraciət</th>
                <th>Kateqoriya</th>
                <th>Status</th>
                <th>Prioritet</th>
                {isStaff && <th>Müraciətçi</th>}
                <th>Şərh</th>
                <th>Tarix</th>
              </tr>
            </thead>
            <tbody>
              {result.appeals.map((a) => (
                <tr key={a.id} className="ap-row" onClick={() => router.push(`/panel/muracietler/${a.id}`)}>
                  <td>
                    <Link href={`/panel/muracietler/${a.id}`} className="ap-title" onClick={(e) => e.stopPropagation()}>
                      {a.title}
                    </Link>
                  </td>
                  <td>{appealCategoryLabel(a.category)}</td>
                  <td>
                    <span className={appealStatusClass(a.status)}>{appealStatusLabel(a.status)}</span>
                  </td>
                  <td>
                    <span className={appealPriorityClass(a.priority)}>{appealPriorityLabel(a.priority)}</span>
                  </td>
                  {isStaff && <td>{a.submitterName ?? "—"}</td>}
                  <td>{a.commentsCount}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString("az-AZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {result.totalCount} müraciət — səhifə {result.page}/{totalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="panel-btn panel-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Əvvəlki
              </button>
              <button type="button" className="panel-btn panel-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateAppealModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            router.push(`/panel/muracietler/${id}`);
          }}
        />
      )}
    </div>
  );
}
