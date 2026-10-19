import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth/AuthContext";
import { keycloakConfig } from "./lib/auth/config";
import { getCompanyName } from "./lib/api/company";
import { CompanyNameProvider } from "./components/CompanyName";
import { ConfirmProvider } from "./components/ConfirmDialog";

// KEYCLOAK_URL (and the other Keycloak vars) are plain runtime env vars, not
// NEXT_PUBLIC_*, so they only hold the right value if this layout is
// rendered against the running container's environment. Without
// force-dynamic, Next prerenders RootLayout during `next build` — before
// Dokploy injects KEYCLOAK_URL — permanently baking in the config.ts
// fallback ("http://localhost:8080/") instead of https://auth.vahid.az.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getCompanyName();
  return {
    title: `${name} İdarəetmə Sistemi`,
    description:
      "Məhəllədəki binalar, mənzillər, kommunal hesablar, maliyyə, inventar və işçi heyəti üçün vahid idarəetmə sistemi.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const companyName = await getCompanyName();
  return (
    <html lang="az" suppressHydrationWarning>
      <head>
        {/* Səhifə çəkilməmişdən əvvəl rejimi qurur (yanıb-sönmənin qarşısı üçün). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t;if(location.pathname.indexOf("/panel")===0)document.documentElement.dataset.area="panel"}catch(e){}`,
          }}
        />
      </head>
      <body>
        <CompanyNameProvider name={companyName}>
          <ConfirmProvider>
            <AuthProvider config={keycloakConfig}>{children}</AuthProvider>
          </ConfirmProvider>
        </CompanyNameProvider>
      </body>
    </html>
  );
}
