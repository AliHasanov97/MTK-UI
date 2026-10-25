"use client";

import { useEffect, useState } from "react";
import { APK_LATEST_PATH, APK_MIN_ANDROID } from "../lib/apkRelease";

type LatestApkResponse = {
  available?: boolean;
  version?: string;
  sizeBytes?: number;
};

function formatSize(bytes: number) {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

/**
 * APK-nın versiya və ölçüsünü göstərir.
 *
 * Məlumat yoxdursa (xarici mənbə əlçatmazdır) sadəcə minimal Android
 * versiyasını göstərir — istifadəçi heç vaxt boş yer görmür.
 */
export function ApkVersion() {
  const [meta, setMeta] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    fetch(APK_LATEST_PATH, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<LatestApkResponse>) : null))
      .then((data) => {
        if (!alive || !data?.available || !data.version) return;
        const size = data.sizeBytes ? formatSize(data.sizeBytes) : null;
        setMeta([`v${data.version}`, size].filter(Boolean).join(" · "));
      })
      .catch(() => {
        /* sus — fallback mətn göstərilir */
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  return <span className="c-android-meta">{meta ?? `${APK_MIN_ANDROID}+`}</span>;
}
