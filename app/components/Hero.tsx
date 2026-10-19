import { Arrow } from "./Arrow";
import { LoginButton } from "./LoginButton";
import { getCompanyName } from "../lib/api/company";

const bars = [38, 56, 44, 72, 60, 86, 68];

export async function Hero() {
  const name = await getCompanyName();
  return (
    <section className="lp-hero section-wrap" id="top">
      <div className="lp-hero-copy">
        <div className="eyebrow">
          <span className="live-dot" /> {name.toLocaleUpperCase("az")} · İDARƏETMƏ SİSTEMİ
        </div>
        <h1>
          Bütün işlər
          <br />
          <span>bir sistemdə.</span>
        </h1>
        <p>
          Binalar, mənzillər və kommunal hesablardan inventar, maliyyə, HR və
          sakin müraciətlərinə qədər — hər rol üçün ayrıca giriş, hər əməliyyat
          üçün aydın tarixçə.
        </p>
        <div className="hero-actions">
          <LoginButton className="button button-dark">
            Sistemə daxil ol <Arrow />
          </LoginButton>
          <a className="text-link" href="#imkanlar">
            İmkanlara bax <span>↓</span>
          </a>
        </div>
      </div>

      <div className="lp-preview" aria-hidden="true">
        <div className="lp-preview-bar">
          <i />
          <i />
          <i />
          <span>Ümumi baxış</span>
        </div>
        <div className="lp-preview-body">
          <div className="lp-preview-kpis">
            <div>
              <small>Aylıq gəlir</small>
              <strong>24 580 ₼</strong>
            </div>
            <div>
              <small>Açıq borc</small>
              <strong>3 940 ₼</strong>
            </div>
            <div>
              <small>Müraciət</small>
              <strong>12</strong>
            </div>
          </div>
          <div className="lp-preview-chart">
            {bars.map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <ul className="lp-preview-list">
            <li>
              <b>⌂</b> Bina 87 · Mənzil 14 <em>Ödənilib</em>
            </li>
            <li>
              <b>⇄</b> Lift təmiri · xərc <em>Qeydə alındı</em>
            </li>
            <li>
              <b>✳</b> Su sızması müraciəti <em>İcrada</em>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
