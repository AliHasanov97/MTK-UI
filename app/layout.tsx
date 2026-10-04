import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth/AuthContext";
import { keycloakConfig } from "./lib/auth/config";

// KEYCLOAK_URL (and the other Keycloak vars) are plain runtime env vars, not
// NEXT_PUBLIC_*, so they only hold the right value if this layout is
// rendered against the running container's environment. Without
// force-dynamic, Next prerenders RootLayout during `next build` — before
// Dokploy injects KEYCLOAK_URL — permanently baking in the config.ts
// fallback ("http://localhost:8080/") instead of https://auth.vahid.az.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MTK İdarəetmə Sistemi",
  description:
    "Bir MTK-nın idarə etdiyi məhəllədəki binalar, mənzillər, kommunal hesablar və maliyyə üçün idarəetmə sistemi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="az">
      <body>
        <AuthProvider config={keycloakConfig}>{children}</AuthProvider>
      </body>
    </html>
  );
}
