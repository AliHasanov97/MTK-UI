"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError } from "../../../lib/api/client";
import { hasAnyRole, ROLES } from "../../../lib/auth/roleConstants";
import {
  getAppealById,
  addComment,
  updateAppealStatus,
  AppealStatus,
  APPEAL_STATUS_LABELS,
  appealCategoryLabel,
  appealPriorityClass,
  appealPriorityLabel,
  appealStatusClass,
  appealStatusLabel,
  type AppealDetail,
} from "../../../lib/api/appeals";
import "../appeals.css";
import { EntityLink, entityHref, useOwnerIdsByUser } from "../../EntityLinks";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu müraciətə icazəniz yoxdur.";
    try {
      const body = JSON.parse(err.message) as { error?: string };
      if (body.error) return body.error;
    } catch {
      /* mətn JSON deyil */
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ALL_STATUSES = Object.values(AppealStatus).filter((v): v is AppealStatus => typeof v === "number");

export function AppealDetailView({ appealId }: { appealId: string }) {
  const auth = useAuth();
  const [appeal, setAppeal] = useState<AppealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState<AppealStatus>(AppealStatus.Submitted);
  const [busy, setBusy] = useState(false);

  const isStaff = auth.status === "authenticated" && hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER]);
  const accessToken = auth.status === "authenticated" ? auth.accessToken : null;
  const submitterOwnerIds = useOwnerIdsByUser(accessToken ?? "", [appeal?.submitterId], isStaff);
  const submitterOwnerId = appeal ? submitterOwnerIds[appeal.submitterId] : null;

  const load = useCallback(async () => {
    if (!accessToken) return;
    const data = await getAppealById(accessToken, appealId);
    setAppeal(data);
    setNewStatus(data.status);
  }, [accessToken, appealId]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAppealById(accessToken, appealId)
      .then((data) => {
        if (cancelled) return;
        setAppeal(data);
        setNewStatus(data.status);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, appealId]);

  if (auth.status !== "authenticated") return null;
  const token = auth.accessToken;

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(success);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    setSending(true);
    setActionError(null);
    try {
      await addComment(token, appealId, text);
      setComment("");
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const back = (
    <Link href="/panel/muracietler" className="ap-back">
      ← Müraciətlərə qayıt
    </Link>
  );

  if (error) {
    return (
      <div className="panel-page">
        {back}
        <div className="panel-denied">
          <h2>Müraciət açılmadı</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div className="panel-page">
        {back}
        <p className="panel-page-lead">Yüklənir…</p>
      </div>
    );
  }

  const closed = appeal.status === AppealStatus.Closed || appeal.status === AppealStatus.Rejected;

  return (
    <div className="panel-page">
      {back}

      <div className="ap-titlebar">
        <h1>{appeal.title}</h1>
        <span className={appealStatusClass(appeal.status)}>{appealStatusLabel(appeal.status)}</span>
        <span className={appealPriorityClass(appeal.priority)}>{appealPriorityLabel(appeal.priority)}</span>
      </div>
      <p className="panel-page-lead">
        {appeal.submitterName ?? "Naməlum"} tərəfindən {formatDateTime(appeal.createdAt)} tarixində göndərilib
      </p>

      <div className="ap-layout">
        <div>
          <section className="ap-card">
            <h2>Təsvir</h2>
            <p className="ap-desc">{appeal.description}</p>
          </section>

          <section className="ap-card">
            <h2>Yazışma ({appeal.comments.length})</h2>
            {appeal.comments.length === 0 ? (
              <p className="ap-none">Hələ şərh yoxdur.</p>
            ) : (
              <div className="ap-thread">
                {appeal.comments.map((c) => {
                  const fromSubmitter = c.userId === appeal.submitterId;
                  // Öz tərəfin mesajları sağda: sakin üçün sakinin, işçi üçün işçilərin yazdıqları.
                  const mine = isStaff ? !fromSubmitter : fromSubmitter;
                  return (
                    <div key={c.id} className={mine ? "ap-msg mine" : "ap-msg"}>
                      <div className="ap-msg-head">
                        <b>{c.userName}</b>
                        <span>{fromSubmitter ? "Müraciətçi" : "İdarə"}</span>
                        <span>{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p>{c.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {closed ? (
              <p className="ap-none">Bu müraciət bağlanıb, yeni şərh əlavə etmək olmur.</p>
            ) : (
              <form className="ap-compose" onSubmit={sendComment}>
                <textarea
                  aria-label="Şərh"
                  placeholder="Şərh yazın…"
                  maxLength={2000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment(e);
                  }}
                />
                <div className="form-actions">
                  <button type="submit" className="panel-btn panel-btn-primary" disabled={sending || !comment.trim()}>
                    {sending ? "Göndərilir…" : "Göndər"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <aside>
          <section className="ap-card">
            <h2>Məlumat</h2>
            <dl className="ap-meta">
              <div>
                <dt>Kateqoriya</dt>
                <dd>{appealCategoryLabel(appeal.category)}</dd>
              </div>
              <div>
                <dt>Müraciətçi</dt>
                <dd>
                  <EntityLink href={submitterOwnerId ? entityHref.owner(submitterOwnerId) : null}>
                    {appeal.submitterName}
                  </EntityLink>
                </dd>
              </div>
              {appeal.assignedToName && (
                <div>
                  <dt>Məsul şəxs</dt>
                  <dd>{appeal.assignedToName}</dd>
                </div>
              )}
              {(appeal.apartmentLabel || appeal.garageLabel) && (
                <div>
                  <dt>Obyekt</dt>
                  <dd>{appeal.apartmentLabel ? `Mənzil ${appeal.apartmentLabel}` : `Qaraj ${appeal.garageLabel}`}</dd>
                </div>
              )}
              {appeal.updatedAt && (
                <div>
                  <dt>Son yenilənmə</dt>
                  <dd>{formatDateTime(appeal.updatedAt)}</dd>
                </div>
              )}
              {appeal.resolvedAt && (
                <div>
                  <dt>Həll edilib</dt>
                  <dd>{formatDateTime(appeal.resolvedAt)}</dd>
                </div>
              )}
              {appeal.closedAt && (
                <div>
                  <dt>Bağlanıb</dt>
                  <dd>{formatDateTime(appeal.closedAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          {isStaff && (
            <section className="ap-card ap-actions">
              <h2>İdarəetmə</h2>

              <div className="form-field">
                <label htmlFor="ap-status">Status</label>
                <select
                  id="ap-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(Number(e.target.value) as AppealStatus)}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {APPEAL_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="panel-btn panel-btn-primary"
                disabled={busy || newStatus === appeal.status}
                onClick={() => run(() => updateAppealStatus(token, appeal.id, newStatus), "Status dəyişdirildi")}
              >
                Statusu dəyiş
              </button>

              {actionError && <p className="form-error">{actionError}</p>}
              {notice && <p className="ap-ok">✓ {notice}</p>}
            </section>
          )}

          {!isStaff && actionError && <p className="form-error">{actionError}</p>}
        </aside>
      </div>
    </div>
  );
}
