import { ApiError } from "../../lib/api/client";
import { errorMessage } from "../inventar/shared";

/**
 * HR backend-i biznes və yoxlama xətalarını `{ error, code }` formatında 400/404 ilə qaytarır —
 * istifadəçiyə yalnız `error` mətnini göstəririk.
 */
export function hrErrorMessage(err: unknown): string {
  if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      /* not JSON — fall through to the generic message */
    }
  }
  return errorMessage(err);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export function fullName(e: { surname: string; name: string; fathersName?: string | null }): string {
  return [e.surname, e.name, e.fathersName].filter(Boolean).join(" ");
}

export const PAGE_SIZE = 10;
