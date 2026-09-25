export type KeycloakConfig = {
  url: string;
  realm: string;
  clientId: string;
  redirectUri: string;
  homeUrl: string;
};

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8080/";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? "mtk";
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? "mtk-web";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/";

export const keycloakConfig: KeycloakConfig = {
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
  redirectUri: new URL("auth/callback", APP_URL).toString(),
  homeUrl: APP_URL,
};
