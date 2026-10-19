"use client";

import { useEffect } from "react";

/**
 * Kök layout-un özündə baş verən xəta (500). Bu fayl layout-u əvəz edir: öz <html>/<body>-si və
 * stilləri olmalıdır, qlobal CSS və mövzu (tund rejim) bura çatmır — rəng sistem mövzusuna görə seçilir.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="az">
      <head>
        <title>Gözlənilməz xəta</title>
        <style>{`
          :root{color-scheme:light dark;--bg:#f7f8f4;--ink:#162522;--muted:#6b7771;--green:#345c4a;--card:#fff;--line:#d6ddd0}
          @media (prefers-color-scheme:dark){:root{--bg:#0e1713;--ink:#e8efe9;--muted:#9fb0a6;--green:#2f6b4d;--card:#1d2d27;--line:#3a5045}}
          *{box-sizing:border-box}
          body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif;text-align:center}
          .code{font-size:clamp(96px,22vw,160px);line-height:1;font-weight:800;letter-spacing:-6px;color:var(--green)}
          h1{margin:6px 0 10px;font-size:26px;letter-spacing:-.8px}
          p{margin:0 auto;max-width:420px;line-height:1.75;color:var(--muted)}
          .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px}
          button,a{font:inherit;font-weight:700;font-size:14px;padding:12px 20px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer;text-decoration:none}
          .primary{background:var(--green);border-color:var(--green);color:#fff}
          small{display:block;margin-top:20px;color:var(--muted);font-size:12px}
        `}</style>
      </head>
      <body>
        <main>
          <div className="code">500</div>
          <h1>Sistemdə kritik xəta baş verdi</h1>
          <p>Səhifə yüklənə bilmədi. Yenidən cəhd edin; davam edərsə, bir qədər sonra qayıdın və ya idarəyə xəbər verin.</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => retry()}>
              Yenidən cəhd et
            </button>
            {/* Tam yükləmə: layout xətası halında client naviqasiyası etibarlı deyil */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Ana səhifə</a>
          </div>
          {error.digest && <small>Xəta kodu: {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
