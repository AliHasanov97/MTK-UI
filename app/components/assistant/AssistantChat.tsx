"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError, apiFetchFile, saveBlobAsFile } from "../../lib/api/client";
import { createPayment, type PaymentMethodKey } from "../../lib/api/payments";
import {
  sendAssistantMessage,
  type AssistantDownloadPayload,
  type AssistantMessage,
  type AssistantPaymentPayload,
  type AssistantPendingAction,
} from "../../lib/api/assistant";
import "./assistant.css";

const SUGGESTIONS = [
  "290 saylı mənzilin borcu nə qədərdir?",
  "Bu ay nə qədər ödəniş yığılıb?",
  "Hazırkı tariflər hansılardır?",
  "Kassada nə qədər pul var?",
];

/** apiFetch xəta gövdəsini mətn kimi atır — backend isə { error, code } qaytarır. */
function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Sessiyanın müddəti bitdi. Yenidən daxil olun.";
    }

    try {
      const parsed = JSON.parse(err.message) as { error?: string; message?: string };
      const text = parsed.error ?? parsed.message;
      if (text) return text;
    } catch {
      // JSON deyilsə, aşağıdaki ümumi mesaj göstərilir.
    }

    return `Xəta baş verdi (HTTP ${err.status}).`;
  }

  if (err instanceof Error) return err.message;

  return "Gözlənilməz xəta baş verdi.";
}

/** Söhbətin hər yerində istifadə olunan dördbucaqlı ulduz işarəsi. */
function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.6l1.95 5.45L19.4 10l-5.45 1.95L12 17.4l-1.95-5.45L4.6 10l5.45-1.95L12 2.6z" />
      <path d="M19 15.2l.85 2.35L22.2 18.4l-2.35.85L19 21.6l-.85-2.35-2.35-.85 2.35-.85L19 15.2z" opacity=".72" />
    </svg>
  );
}

export function AssistantChat({ onClose }: { onClose?: () => void }) {
  const auth = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Backend-in təsdiq gözləyən əməliyyatı: ödəniş modalı və ya PDF yükləmə kartı.
  const [pendingAction, setPendingAction] = useState<AssistantPendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const accessToken = auth.status === "authenticated" ? auth.accessToken : null;

  useEffect(() => {
    // Yeni mesaj gələndə siyahını sona sürüşdür.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Təsdiq modalı açıqkən Escape yalnız modalı bağlayır — bütün köməkçini yox.
  useEffect(() => {
    if (pendingAction?.type !== "create_payment") return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingAction(null);
      setActionError(null);
    }

    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [pendingAction]);

  async function submit(text: string) {
    const content = text.trim();

    if (!content || pending || !accessToken) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content }];

    setMessages(nextMessages);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    setError(null);
    setPending(true);

    try {
      // Backend tarixçəni özü kəsir (Assistant:MaxHistoryMessages), ona görə
      // bütün söhbət göndərilir — server heç nə saxlamır.
      const reply = await sendAssistantMessage(
        accessToken,
        nextMessages.map(({ role, content: body }) => ({ role, content: body })),
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.reply,
        },
      ]);
      setPendingAction(reply.pendingAction ?? null);
      setActionError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  function resetConversation() {
    setMessages([]);
    setError(null);
    setPendingAction(null);
    setActionError(null);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    inputRef.current?.focus();
  }

  function autoGrow(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 96)}px`;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit(input);
    }
  }

  /** Təsdiqlənmiş ödənişi mövcud Payments endpoint-i ilə yazır. */
  async function confirmPayment() {
    if (!accessToken || !pendingAction) return;

    const payload = pendingAction.payload as AssistantPaymentPayload | null;

    if (!payload?.ownerId || !(payload.amount > 0)) {
      setActionError("Ödəniş məlumatı natamamdır. Sualı yenidən verin.");
      return;
    }

    setActionBusy(true);
    setActionError(null);

    try {
      const paymentId = await createPayment(accessToken, {
        ownerId: payload.ownerId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod as PaymentMethodKey,
        notes: payload.notes ?? null,
        apartmentId: payload.apartmentId ?? null,
        garageId: payload.garageId ?? null,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Ödəniş qeydə alındı: ${payload.amount} ₼. Qəbzi aşağıdan yükləyə bilərsiniz.`,
        },
      ]);

      setPendingAction({
        type: "download",
        title: "Ödəniş qəbzi",
        description: `${payload.amount} ₼`,
        payload: {
          path: `api/payments/payments/${paymentId}/receipt`,
          label: "Qəbzi yüklə (PDF)",
        } satisfies AssistantDownloadPayload,
      });
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  /** Təsdiq paketindəki API yolundan PDF-i tokenlə yükləyir. */
  async function downloadFromAction() {
    if (!accessToken || !pendingAction) return;

    const payload = pendingAction.payload as AssistantDownloadPayload | null;

    if (!payload?.path) return;

    setActionBusy(true);
    setActionError(null);

    try {
      const { blob, fileName } = await apiFetchFile(payload.path, accessToken);
      saveBlobAsFile(blob, fileName);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  if (!accessToken) return null;

  return (
    <div className="ai-chat">
      <div className="ai-chat-head">
        <span className="ai-chat-badge">
          <SparkleIcon size={17} />
        </span>
        <div className="ai-chat-head-text">
          <span className="ai-chat-title">AI köməkçi</span>
          <span className="ai-chat-subtitle">Mənzil, borc və ödənişlər barədə soruşun</span>
        </div>
        <div className="ai-chat-head-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="ai-chat-reset"
              onClick={resetConversation}
              disabled={pending}
              title="Söhbəti təmizlə"
            >
              Yeni söhbət
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="ai-chat-close"
              onClick={onClose}
              aria-label="Söhbəti bağla"
              title="Bağla"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path
                  d="M1.5 1.5l11 11m0-11l-11 11"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="ai-chat-log" ref={listRef} aria-live="polite" aria-label="Söhbət">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <span className="ai-chat-empty-mark">
              <SparkleIcon size={22} />
            </span>
            <p className="ai-chat-empty-title">Necə kömək edə bilərəm?</p>
            <p className="ai-chat-empty-text">
              Mənzil nömrəsi, sahibin adı və ya məbləğ yazmaq kifayətdir.
            </p>
            <div className="ai-chat-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="ai-chat-suggestion"
                  onClick={() => void submit(suggestion)}
                  disabled={pending}
                >
                  <span>{suggestion}</span>
                  <span className="ai-chat-suggestion-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`ai-msg ai-msg-${message.role}`}>
            {message.role === "assistant" && (
              <span className="ai-msg-avatar">
                <SparkleIcon size={13} />
              </span>
            )}
            <div className="ai-msg-body">
              <div className="ai-msg-bubble">{message.content}</div>
            </div>
          </div>
        ))}

        {pending && (
          <div className="ai-msg ai-msg-assistant">
            <span className="ai-msg-avatar">
              <SparkleIcon size={13} />
            </span>
            <div className="ai-msg-body">
              <div className="ai-msg-bubble ai-msg-thinking" role="status" aria-label="Cavab hazırlanır">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="ai-chat-error" role="alert">
          {error}
        </div>
      )}

      {pendingAction?.type === "download" && (
        <div className="ai-download">
          <div className="ai-download-text">
            <strong>{pendingAction.title}</strong>
            {pendingAction.description && <span>{pendingAction.description}</span>}
          </div>
          <button
            type="button"
            className="ai-download-btn"
            onClick={() => void downloadFromAction()}
            disabled={actionBusy}
          >
            {actionBusy
              ? "Yüklənir…"
              : ((pendingAction.payload as AssistantDownloadPayload | null)?.label ?? "PDF yüklə")}
          </button>
          <button
            type="button"
            className="ai-download-close"
            onClick={() => setPendingAction(null)}
            aria-label="Yükləmə kartını bağla"
          >
            ×
          </button>
          {actionError && <p className="ai-download-error">{actionError}</p>}
        </div>
      )}

      <div className="ai-chat-composer">
        <div className="ai-chat-composer-box">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              autoGrow(event.currentTarget);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Məsələn: 290 saylı mənzil 100 manat ödəniş etdi"
            rows={1}
            disabled={pending}
            maxLength={2000}
            aria-label="Mesajınız"
          />
          <button
            type="button"
            className="ai-chat-send"
            onClick={() => void submit(input)}
            disabled={pending || input.trim().length === 0}
            aria-label="Göndər"
            title="Göndər (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 19V5m0 0l-6 6m6-6l6 6"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
        <p className="ai-chat-foot">
          <span>Enter — göndər</span>
          <span className="ai-chat-foot-sep">·</span>
          <span>Ödəniş yalnız təsdiqlə qeydə alınır</span>
        </p>
      </div>

      {pendingAction?.type === "create_payment" &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="ai-confirm-backdrop"
            onClick={(event) => {
              // Fon klikində modal bağlanır — əməliyyat təsdiqlənmir.
              if (event.target !== event.currentTarget || actionBusy) return;
              setPendingAction(null);
              setActionError(null);
            }}
          >
            <div
              className="ai-confirm"
              role="dialog"
              aria-modal="true"
              aria-label={pendingAction.title}
            >
              <span className="ai-confirm-icon" aria-hidden="true">
                <SparkleIcon size={18} />
              </span>
              <h3 className="ai-confirm-title">{pendingAction.title}</h3>
              {pendingAction.description && (
                <p className="ai-confirm-desc">{pendingAction.description}</p>
              )}
              {actionError && <p className="ai-confirm-error">{actionError}</p>}
              <div className="ai-confirm-actions">
                <button
                  type="button"
                  className="ai-confirm-cancel"
                  onClick={() => {
                    setPendingAction(null);
                    setActionError(null);
                  }}
                  disabled={actionBusy}
                >
                  Ləğv et
                </button>
                <button
                  type="button"
                  className="ai-confirm-ok"
                  onClick={() => void confirmPayment()}
                  disabled={actionBusy}
                >
                  {actionBusy ? "Qeydə alınır…" : "Təsdiq et"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
