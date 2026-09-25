"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { searchAuditLogs, type SearchAuditLogsResult } from "../../lib/api/identity";

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
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [result, setResult] = useState<SearchAuditLogsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    searchAuditLogs(auth.accessToken, {
      entityType: entityType || undefined,
      action: action || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      pageNumber,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setResult(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, entityType, action, dateFrom, dateTo, pageNumber]);

  if (auth.status !== "authenticated") return null;

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Entity növü (məs: User)…"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPageNumber(1);
          }}
        />
        <input
          className="panel-search"
          placeholder="Əməliyyat (məs: Created)…"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPageNumber(1);
          }}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPageNumber(1);
          }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPageNumber(1);
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
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Entity</th>
                <th>Əməliyyat</th>
                <th>İstifadəçi ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5}>Nəticə tapılmadı.</td>
                </tr>
              )}
              {result.auditLogs.map((log) => {
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
                      <td>{log.action}</td>
                      <td>{log.userId ? log.userId.slice(0, 8) + "…" : "—"}</td>
                      <td>{isOpen ? "▲" : "▼"}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="data-table-subrow">
                          {log.oldValues && (
                            <>
                              <strong>Köhnə dəyərlər:</strong>
                              <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
                                {log.oldValues}
                              </pre>
                            </>
                          )}
                          {log.newValues && (
                            <>
                              <strong>Yeni dəyərlər:</strong>
                              <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
                                {log.newValues}
                              </pre>
                            </>
                          )}
                          {!log.oldValues && !log.newValues && <p>Əlavə məlumat yoxdur.</p>}
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
              Cəmi {result.totalCount} qeyd — səhifə {result.pageNumber}/{totalPages}
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
