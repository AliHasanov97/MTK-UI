"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  auditActionLabel,
  searchModuleAuditLogs,
  type AuditModuleKey,
  type AuditSearchResult,
} from "../../lib/api/auditLogs";

import { AuditDiff } from "./AuditDiff";
import { DateInput } from "../../components/DateInput";

const PAGE_SIZE = 20;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function AuditLogView() {
  const auth = useAuth();
  const [module, setModule] = useState<AuditModuleKey>(AUDIT_MODULES[0].key);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [result, setResult] = useState<AuditSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    let cancelled = false;
    searchModuleAuditLogs(auth.accessToken, module, {
      entityType: entityType || undefined,
      action: action || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      page: pageNumber,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setResult(null);
        setError(errorMessage(err));
      });
    // Modul tez-tez dəyişəndə köhnə cavab yenisini əvəz etməsin.
    return () => {
      cancelled = true;
    };
  }, [auth, module, entityType, action, dateFrom, dateTo, pageNumber]);

  if (auth.status !== "authenticated") return null;

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  const resetPage = () => {
    setPageNumber(1);
    setExpandedId(null);
  };

  return (
    <div>
      <div className="panel-toolbar">
        <select
          className="panel-select"
          aria-label="Modul"
          value={module}
          onChange={(e) => {
            setModule(e.target.value as AuditModuleKey);
            setResult(null);
            resetPage();
          }}
        >
          {AUDIT_MODULES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          className="panel-search"
          placeholder="Entity növü (məs: Employee)…"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            resetPage();
          }}
        />
        <select
          className="panel-select"
          aria-label="Əməliyyat"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            resetPage();
          }}
        >
          <option value="">Bütün əməliyyatlar</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <DateInput
          aria-label="Başlanğıc tarix"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            resetPage();
          }}
        />
        <DateInput
          aria-label="Son tarix"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            resetPage();
          }}
        />
      </div>

      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {!result ? (
        !error && <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Entity</th>
                <th>Əməliyyat</th>
                <th>İstifadəçi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={5}>Nəticə tapılmadı.</td>
                </tr>
              )}
              {result.rows.map((log) => {
                const isOpen = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr
                      className="data-table-row-clickable"
                      onClick={() => setExpandedId(isOpen ? null : log.id)}
                    >
                      <td>{new Date(log.timestamp).toLocaleString("az-AZ")}</td>
                      <td>
                        {log.entityType} <small>({log.entityId.slice(0, 8)}…)</small>
                      </td>
                      <td>{auditActionLabel(log.action)}</td>
                      <td>{log.userLabel ?? "—"}</td>
                      <td>{isOpen ? "▲" : "▼"}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="data-table-subrow">
                          <AuditDiff oldValues={log.oldValues} newValues={log.newValues} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {result.totalCount} qeyd — səhifə {result.page}/{totalPages}
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
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
