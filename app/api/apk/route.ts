import { getUpstreamApkUrl } from "../../lib/apkRelease";

export const dynamic = "force-dynamic";

/**
 * APK yükləmə nöqtəsi: fayl serverdən keçərək verilir, ona görə brauzerdə
 * və endirmə tarixçəsində yalnız saytın öz ünvanı görünür.
 */
export async function GET() {
  try {
    const upstream = await fetch(getUpstreamApkUrl(), {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("APK hazırda əlçatan deyil. Bir az sonra yenidən cəhd edin.", {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const headers = new Headers({
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="mtk-app.apk"',
      "Cache-Control": "no-store",
    });

    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);

    return new Response(upstream.body, { headers });
  } catch {
    return new Response("APK hazırda əlçatan deyil. Bir az sonra yenidən cəhd edin.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
