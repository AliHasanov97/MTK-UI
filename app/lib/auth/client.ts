import type { KeycloakConfig } from "./config";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
};

async function requestToken(config: KeycloakConfig, body: URLSearchParams) {
  const tokenUrl = new URL(
    `realms/${config.realm}/protocol/openid-connect/token`,
    config.url,
  );
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Keycloak token endpoint returned ${res.status}`);
  }
  return (await res.json()) as TokenResponse;
}

export function exchangeCodeForTokens(
  config: KeycloakConfig,
  code: string,
  codeVerifier: string,
) {
  return requestToken(
    config,
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  );
}

export function refreshAccessToken(config: KeycloakConfig, refreshToken: string) {
  return requestToken(
    config,
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientId,
      refresh_token: refreshToken,
    }),
  );
}

export function buildLogoutUrl(config: KeycloakConfig, idToken?: string) {
  const logoutUrl = new URL(
    `realms/${config.realm}/protocol/openid-connect/logout`,
    config.url,
  );
  logoutUrl.searchParams.set("client_id", config.clientId);
  logoutUrl.searchParams.set("post_logout_redirect_uri", config.homeUrl);
  if (idToken) logoutUrl.searchParams.set("id_token_hint", idToken);
  return logoutUrl.toString();
}

export function buildAccountUrl(config: KeycloakConfig) {
  return new URL(`realms/${config.realm}/account`, config.url).toString();
}

export function buildLoginUrl(config: KeycloakConfig, codeChallenge: string) {
  const authUrl = new URL(
    `realms/${config.realm}/protocol/openid-connect/auth`,
    config.url,
  );
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  return authUrl.toString();
}

export function toTokenSet(response: TokenResponse) {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    idToken: response.id_token,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
}
