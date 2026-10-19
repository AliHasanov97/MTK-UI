"use client";

import { useEffect } from "react";

/** Panel səhifəsində xəta: yan menyu və yuxarı zolaq qalır, yalnız məzmun sahəsi xəta kartı ilə əvəz olunur. */
export default function PanelError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel-page">
      <div className="panel-denied">
        <h2>Bu səhifədə xəta baş verdi</h2>
        <p>Məlumat yüklənərkən gözlənilməz problem yarandı. Yenidən cəhd edin; davam edərsə, idarəyə xəbər verin.</p>
        {error.digest && (
          <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.7 }}>
            Xəta kodu: {error.digest}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => retry()}>
            Yenidən cəhd et
          </button>
        </div>
      </div>
    </div>
  );
}
