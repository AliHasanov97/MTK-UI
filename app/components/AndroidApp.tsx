import { APK_DOWNLOAD_PATH } from "../lib/apkRelease";
import { ApkVersion } from "./ApkVersion";

const points = ["Borc və ödənişlər", "Müraciət göndərmə", "Bildirişlər", "Özünü yeniləyir"];

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v11m0 0l-4-4m4 4l4-4" />
      <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/**
 * Landing səhifəsində Android tətbiqi üçün ayrıca, diqqət çəkən bölmə.
 *
 * Yükləmə öz domenimizdən gedir (`/api/apk`) — xarici ünvan görünmür.
 */
export function AndroidApp() {
  return (
    <section className="lp-android" id="android">
      <div className="section-wrap lp-android-inner">
        <div className="lp-android-copy">
          <div className="eyebrow">ANDROID TƏTBİQ</div>
          <h2>
            İdarəetmə
            <br />
            <span>cibinizdə.</span>
          </h2>
          <p>
            Borc, ödəniş və müraciətlər telefonda — brauzer açmadan. Tətbiq yeni
            versiyanı özü tapır və bir toxunuşla yenilənir.
          </p>
          <div className="lp-android-actions">
            <a className="button lp-android-button" href={APK_DOWNLOAD_PATH} download>
              <DownloadIcon />
              APK yüklə
            </a>
            <ApkVersion />
          </div>
          <ul className="lp-android-points">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="lp-android-visual">
          <div className="lp-phone">
            <span className="lp-phone-key lp-phone-key--vol" aria-hidden="true" />
            <span className="lp-phone-key lp-phone-key--pwr" aria-hidden="true" />
            <div className="lp-phone-screen">
              {/* Real cihazdan götürülmüş ekran görüntüsü (S23) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/app/mtk-app-s23.webp"
                alt="MTK mobil tətbiqi — əsas ekran"
                width={760}
                height={1689}
                loading="lazy"
                decoding="async"
              />
              <span className="lp-phone-glare" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
