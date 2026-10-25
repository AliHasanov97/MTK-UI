import { NextResponse } from "next/server";
import { getLatestApk } from "../../../lib/apkRelease";

export const dynamic = "force-dynamic";

/** Ən son APK versiyasının məlumatı (UI üçün). Xarici ünvan qaytarılmır. */
export async function GET() {
  const apk = await getLatestApk();

  if (!apk) {
    return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { available: true, ...apk },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
