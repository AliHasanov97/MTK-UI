import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth/AuthContext";
import { keycloakConfig } from "./lib/auth/config";

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
