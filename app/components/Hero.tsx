import { ArrowRightIcon } from "./icons";
import { LoginButton } from "./LoginButton";

const heroStats = [
  { value: "8", label: "Modul" },
  { value: "5", label: "Rol" },
  { value: "1", label: "Baza" },
  { value: "100%", label: "Tarixçə" },
];

export function Hero() {
  return (
    <section className="c-hero">
      <div className="c-wrap c-hero-inner">
        <span className="c-badge c-badge-lime">MƏNZİL-TİKİNTİ KOOPERATİVİ</span>

        <h1>
          Bütün işlər
          <br />
          <span>bir sistemdə.</span>
        </h1>

        <p className="c-hero-lead">
          Binalar, mənzillər, hesablar, maliyyə, inventar və işçi heyəti — hamısı
          bir yerdə. Şəffaf, dəqiq və sadə.
        </p>

        <div className="c-hero-actions">
          <LoginButton className="c-btn c-btn-orange">
            Sistemə daxil ol
            <span className="c-btn-arrow">
              <ArrowRightIcon size={17} />
            </span>
          </LoginButton>
          <a className="c-hero-hint" href="#imkanlar">
            İmkanlara bax ↓
          </a>
        </div>

        <div className="c-hero-stats">
          {heroStats.map((s) => (
            <div className="c-hero-stat" key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
