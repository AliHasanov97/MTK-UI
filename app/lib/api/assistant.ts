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

export type AssistantReply = {
  reply: string;
  provider: string;
  toolCalls: AssistantToolTrace[];
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
