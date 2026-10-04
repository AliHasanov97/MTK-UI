import { apiConfig } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(path, apiConfig.baseUrl);
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

// "filename=\"X\"" or "filename=X" (quotes optional per RFC 6266) — the backend's
// File(...) result always sets this, so a missing header is treated as a bug
// upstream, not a case to silently paper over with a made-up name.
function fileNameFromContentDisposition(header: string | null): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  if (!match) {
    throw new Error("Server cavabında fayl adı (Content-Disposition) yoxdur.");
  }
  return match[1];
}

/**
 * For binary (PDF/Excel/Word) export endpoints — same auth header as apiFetch, but
 * reads a Blob instead of parsing JSON, and takes the filename the backend already
 * chose (via its File(...) result) rather than inventing one client-side.
 */
export async function apiFetchFile(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<{ blob: Blob; fileName: string }> {
  const url = new URL(path, apiConfig.baseUrl);
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }

  const blob = await res.blob();
  const fileName = fileNameFromContentDisposition(res.headers.get("Content-Disposition"));
  return { blob, fileName };
}

/**
 * For multipart file-upload endpoints ([FromForm] on the backend) — same auth header
 * as apiFetch, but takes a FormData body and deliberately does NOT set Content-Type:
 * the browser fills in `multipart/form-data; boundary=...` itself, and overriding it
 * (as apiFetch's JSON default would) breaks the backend's form binding.
 */
export async function apiUploadFile<T>(
  path: string,
  accessToken: string,
  formData: FormData,
): Promise<T> {
  const url = new URL(path, apiConfig.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }

  return (await res.json()) as T;
}

/** Triggers the browser's native "save file" flow for an already-fetched Blob. */
export function saveBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
