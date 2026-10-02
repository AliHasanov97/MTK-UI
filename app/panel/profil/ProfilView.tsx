"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { getCurrentUser } from "../../lib/api/identity";
import { getOwnerByUserId } from "../../lib/api/owners";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    if (err.status === 404) return "Sizin adınıza bağlı sahib qeydi tapılmadı. Zəhmət olmasa idarəçi ilə əlaqə saxlayın.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

// Sahiblərin öz Owner qeydinin detalları artıq /panel/binalar/sahibler/[id]-də
// tam qurulub (read-only — bu rolun yazma hüququ yoxdur, düymələr gizlidir).
// Bu səhifə sadəcə "mənim öz id-im hansıdır" sualını həll edib ora yönləndirir.
export function ProfilView() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    getCurrentUser(auth.accessToken)
      .then((user) => getOwnerByUserId(auth.accessToken, user.id))
      .then((owner) => router.replace(`/panel/binalar/sahibler/${owner.id}`))
      .catch((err) => setError(errorMessage(err)));
  }, [auth, router]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <p className="panel-page-lead">Yüklənir…</p>;
}
