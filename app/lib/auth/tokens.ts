export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
};

export type DecodedAccessToken = {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  exp: number;
};

const STORAGE_KEY = "mtk_auth_tokens";
const EXPIRY_LEEWAY_MS = 10_000;

export function saveTokens(tokens: TokenSet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function loadTokens(): TokenSet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenSet) : null;
  } catch {
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isExpired(tokens: TokenSet) {
  return Date.now() >= tokens.expiresAt - EXPIRY_LEEWAY_MS;
}

export function decodeJwt<T = DecodedAccessToken>(token: string): T {
  const payload = token.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
