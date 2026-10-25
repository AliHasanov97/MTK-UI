import { APK_DOWNLOAD_PATH } from "../lib/apkRelease";
import { DownloadIcon } from "./icons";
import { ApkVersion } from "./ApkVersion";

const points = ["Borc və ödənişlər", "Müraciət göndərmə", "Bildirişlər", "Özünü yeniləyir"];

/**
 * Landing səhifəsində Android tətbiqi üçün ayrıca bölmə.
 *
 * Yükləmə öz domenimizdən gedir (`/api/apk`) — xarici ünvan görünmür.
 */
export function AndroidApp() {
  return (
    <section className="c-android" id="android">
      <div className="c-wrap">
        <div className="c-android-card">
          <div className="c-android-inner">
            <div className="c-android-copy">
              <span className="c-badge">ANDROID TƏTBİQ</span>
              <h2>
                İdarəetmə
                <br />
                <span>cibinizdə.</span>
              </h2>
              <p>
                Borc, ödəniş və müraciətlər telefonda — brauzer açmadan. Tətbiq yeni
                versiyanı özü tapır və bir toxunuşla yenilənir.
              </p>
              <div className="c-android-actions">
                <a className="c-btn c-btn-orange" href={APK_DOWNLOAD_PATH} download>
                  <DownloadIcon size={17} />
                  APK yüklə
                </a>
                <ApkVersion />
              </div>
              <ul className="c-android-points">
                {points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="c-android-visual">
              <div className="c-phone">
                <span className="c-phone-key c-phone-key--vol" aria-hidden="true" />
                <span className="c-phone-key c-phone-key--pwr" aria-hidden="true" />
                <div className="c-phone-screen">
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
                  <span className="c-phone-glare" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
