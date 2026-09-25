import { Arrow } from "./Arrow";
import { features } from "../content";

export function Features() {
  return (
    <section className="features section-wrap" id="imkanlar">
      <div className="section-heading">
        <div>
          <div className="eyebrow">SİSTEMİN İMKANLARI</div>
          <h2>
            MTK-nın əsas
            <br />
            <span>idarəetmə sahələri.</span>
          </h2>
        </div>
        <p>
          Bir MTK-nın idarə etdiyi məhəllədəki binalar, mənzillər, kommunal
          hesablar və gündəlik əməliyyatlar.
        </p>
      </div>
      <div className="feature-grid">
        {features.map((feature) => (
          <article className="feature-card" key={feature.number}>
            <div className="feature-top">
              <span className="feature-icon">{feature.icon}</span>
              <span className="feature-number">{feature.number}</span>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <a href="#nece-isleyir" aria-label={`${feature.title} haqqında ətraflı`}>
              <Arrow />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
