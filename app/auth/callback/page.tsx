"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { exchangeCodeForTokens, toTokenSet } from "../../lib/auth/client";
import { keycloakConfig } from "../../lib/auth/config";
import { PKCE_VERIFIER_KEY, useAuth } from "../../lib/auth/AuthContext";

export default function CallbackPage() {
  const router = useRouter();
  const { completeLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error_description") ?? params.get("error");
    const code = params.get("code");

    // This effect drives a one-time redirect handshake with Keycloak, so
    // every branch below reports its outcome (success or failure) rather
    // than deriving state from props — there's nothing to compute during
    // render here.
    if (errorParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(errorParam);
      return;
    }
    if (!code) {
      setError("Giriş kodu tapılmadı.");
      return;
    }
    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    if (!codeVerifier) {
      setError("Giriş sessiyası bitib. Zəhmət olmasa yenidən cəhd edin.");
      return;
    }

    exchangeCodeForTokens(keycloakConfig, code, codeVerifier)
      .then((res) => {
        sessionStorage.removeItem(PKCE_VERIFIER_KEY);
        completeLogin(toTokenSet(res));
        router.replace("/panel");
      })
      .catch(() => setError("Token mübadiləsi uğursuz oldu."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="auth-callback">
      <div className="auth-callback-card">
        {error ? (
          <>
            <h1>Giriş uğursuz oldu</h1>
            <p>{error}</p>
            <Link href="/">Ana səhifəyə qayıt</Link>
          </>
        ) : (
          <>
            <h1>Giriş edilir…</h1>
            <p>Zəhmət olmasa gözləyin.</p>
          </>
        )}
      </div>
    </main>
  );
}
