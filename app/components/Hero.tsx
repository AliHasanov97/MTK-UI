import { Arrow } from "./Arrow";

export function Hero() {
  return (
    <section className="hero hero-centered section-wrap" id="top">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="live-dot" /> MƏNZİL-TİKİNTİ KOOPERATİVİ ÜÇÜN
        </div>
        <h1>
          MTK İdarəetmə
          <br />
          <span>Sistemi</span>
        </h1>
        <p className="hero-description">
          Binalar və mənzillərdən kommunal hesablar, ödənişlər və xərclərə
          qədər — MTK-nın gündəlik işləri üçün vahid idarəetmə sistemi.
        </p>
        <div className="hero-actions">
          <a className="button button-dark" href="#imkanlar">
            Sistemin imkanları <Arrow />
          </a>
          <a className="text-link" href="#nece-isleyir">
            Necə işləyir <span>↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
