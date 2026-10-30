import { apiFetch } from "./client";

type Envelope<T> = { data: T; message: string };

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantToolTrace = {
  name: string;
  arguments: string;
  succeeded: boolean;
};

/**
 * Backend-in birbaşa yerinə yetirmədiyi, istifadəçi təsdiqi/kliki gözləyən əməliyyat.
 * `create_payment` → modal açılır və təsdiqdən sonra ödəniş endpoint-i çağırılır.
 * `download` → göstərilən API yolundan PDF yüklənir.
 */
export type AssistantPendingAction = {
  type: "create_payment" | "download" | "confirm" | (string & {});
  title: string;
  description?: string | null;
  payload?: Record<string, unknown> | null;
};

export type AssistantPaymentPayload = {
  ownerId: string;
  apartmentId?: string | null;
  garageId?: string | null;
  amount: number;
  paymentMethod: "Cash" | "BankTransfer" | "Card";
  notes?: string | null;
};

export type AssistantDownloadPayload = {
  path: string;
  label?: string;
};

/**
 * Ümumi təsdiq paketi: backend tool-u heç nə yazmır, yalnız hansı endpoint-in
 * hansı body ilə çağırılacağını qaytarır. İstifadəçi təsdiqləyəndə frontend
 * həmin çağırışı özü edir.
 */
export type AssistantConfirmPayload = {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  successMessage?: string;
};

export type AssistantReply = {
  reply: string;
  provider: string;
  toolCalls: AssistantToolTrace[];
  pendingAction?: AssistantPendingAction | null;
};

/**
 * Backend-dəki tool-loop-u işə salır. Tarixçə client-dən gedir (MVP-də serverdə
 * saxlanmır), ona görə hər çağırışda bütün söhbət göndərilir.
 */
export function sendAssistantMessage(accessToken: string, messages: AssistantMessage[]) {
  return apiFetch<Envelope<AssistantReply>>("api/assistant/chat", accessToken, {
    method: "POST",
    body: JSON.stringify({ messages }),
  }).then((envelope) => envelope.data);
}
