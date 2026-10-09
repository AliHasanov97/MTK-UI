"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { buildLoginUrl, buildLogoutUrl, refreshAccessToken, toTokenSet } from "./client";
import { generatePkcePair } from "./pkce";
import {
  clearTokens,
  decodeJwt,
  isExpired,
  loadTokens,
  saveTokens,
  type TokenSet,
} from "./tokens";
import type { KeycloakConfig } from "./config";

const PKCE_VERIFIER_KEY = "mtk_pkce_verifier";
const REFRESH_BUFFER_MS = 30_000;

export type AuthUser = {
  username: string;
  name?: string;
  email?: string;
  roles: string[];
};

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser; accessToken: string };

type AuthContextValue = AuthState & {
  config: KeycloakConfig;
  login: () => Promise<void>;
  logout: () => void;
  completeLogin: (tokens: TokenSet) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function tokensToUser(tokens: TokenSet): AuthUser {
  const decoded = decodeJwt(tokens.accessToken);
  return {
    username: decoded.preferred_username ?? decoded.sub,
    name: decoded.name,
    email: decoded.email,
    roles: decoded.realm_access?.roles ?? [],
  };
}

export function AuthProvider({
  config,
  children,
}: {
  config: KeycloakConfig;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const applyTokens = useCallback((tokens: TokenSet) => {
    saveTokens(tokens);
    setState({
      status: "authenticated",
      accessToken: tokens.accessToken,
      user: tokensToUser(tokens),
    });
  }, []);

  const refreshWithStoredToken = useCallback(
    (refreshToken: string) =>
      refreshAccessToken(config, refreshToken)
        .then((res) => applyTokens(toTokenSet(res)))
        .catch(() => {
          clearTokens();
          setState({ status: "unauthenticated" });
        }),
    [config, applyTokens],
  );

  useEffect(() => {
    // Reading localStorage must wait for the client-only effect phase (it
    // doesn't exist during SSR), so these are the initial synchronous
    // state derivations from that external store, not derived-from-props state.
    const stored = loadTokens();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "unauthenticated" });
      return;
    }
    if (!isExpired(stored)) {
      setState({
        status: "authenticated",
        accessToken: stored.accessToken,
        user: tokensToUser(stored),
      });
      return;
    }
    if (!stored.refreshToken) {
      clearTokens();
      setState({ status: "unauthenticated" });
      return;
    }
    refreshWithStoredToken(stored.refreshToken);
  }, [config, applyTokens, refreshWithStoredToken]);

  // Proactively refresh the access token in the background, well before it
  // expires, so API calls in flight never race an expiring token and the
  // user is never bounced back to Keycloak while a refresh token is valid.
  useEffect(() => {
    if (state.status !== "authenticated") return;

    const stored = loadTokens();
    if (!stored?.refreshToken) return;

    const delay = Math.max(stored.expiresAt - Date.now() - REFRESH_BUFFER_MS, 0);
    const timer = setTimeout(() => refreshWithStoredToken(stored.refreshToken!), delay);

    return () => clearTimeout(timer);
  }, [state, config, applyTokens, refreshWithStoredToken]);

  // The setTimeout above is a best-effort schedule: browsers throttle or fully
  // pause timers in a backgrounded/inactive tab (and suspend them entirely
  // across system sleep), so it can miss its mark while the tab is away. If the
  // user comes back to find the token already past expiry, catch up immediately
  // on return rather than waiting for the next request to fail with a 401 that
  // only a manual page reload would otherwise recover from.
  useEffect(() => {
    if (state.status !== "authenticated") return;

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const stored = loadTokens();
      if (!stored || !isExpired(stored)) return;
      if (!stored.refreshToken) {
        clearTokens();
        setState({ status: "unauthenticated" });
        return;
      }
      refreshWithStoredToken(stored.refreshToken);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [state, refreshWithStoredToken]);

  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePkcePair();
    sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
    window.location.href = buildLoginUrl(config, codeChallenge);
  }, [config]);

  const logout = useCallback(() => {
    const stored = loadTokens();
    clearTokens();
    setState({ status: "unauthenticated" });
    window.location.href = buildLogoutUrl(config, stored?.idToken);
  }, [config]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, config, login, logout, completeLogin: applyTokens }),
    [state, config, login, logout, applyTokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { PKCE_VERIFIER_KEY };
