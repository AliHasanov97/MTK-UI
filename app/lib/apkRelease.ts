/**
 * Android tətbiqinin (APK) server tərəfli mənbəyi.
 *
 * Xarici ünvanlar (GitHub) yalnız serverdə qalır — brauzerə heç vaxt
 * göstərilmir. İstifadəçi yalnız `/api/apk` daxili yollarını görür.
 */
const REPO = "AliHasanov97/MTK-MOBILE";
const UPSTREAM_APK_URL = `https://github.com/${REPO}/releases/latest/download/app-release.apk`;
const UPSTREAM_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;

/** Brauzerin istifadə etdiyi daxili yollar. */
export const APK_DOWNLOAD_PATH = "/api/apk";
export const APK_LATEST_PATH = "/api/apk/latest";

/** Tətbiqin minimal Android versiyası (app/build.gradle.kts → minSdk = 26). */
export const APK_MIN_ANDROID = "Android 8.0";

export type LatestApk = {
  version: string;
  sizeBytes: number;
  publishedAt: string | null;
};

type ReleaseAsset = { name?: string; size?: number };
type ReleaseResponse = { tag_name?: string; published_at?: string | null; assets?: ReleaseAsset[] };

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; value: LatestApk | null } | null = null;

export function getUpstreamApkUrl(): string {
  return UPSTREAM_APK_URL;
}

/**
 * Ən son buraxılışın məlumatı (versiya, ölçü, tarix). 10 dəqiqə keşlənir;
 * xarici API əlçatmaz olsa `null` qaytarır (UI sadəcə versiyanı göstərmir).
 */
export async function getLatestApk(): Promise<LatestApk | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  let value: LatestApk | null = null;
  try {
    const res = await fetch(UPSTREAM_RELEASE_API, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const release = (await res.json()) as ReleaseResponse;
      const asset = release.assets?.find((a) => a.name?.endsWith(".apk"));
      if (asset) {
        value = {
          version: (release.tag_name ?? "").replace(/^v/i, ""),
          sizeBytes: asset.size ?? 0,
          publishedAt: release.published_at ?? null,
        };
      }
    }
  } catch {
    value = null;
  }

  cache = { at: Date.now(), value };
  return value;
}
