import { modules } from "../content";

export function Modules() {
  return (
    <section className="lp-modules section-wrap" id="imkanlar">
      <div className="section-heading">
        <div>
          <div className="eyebrow">SİSTEMİN İMKANLARI</div>
          <h2>
            Səkkiz modul,
            <br />
            <span>bir ortaq məlumat.</span>
          </h2>
        </div>
        <p>
          Hər modul digərləri ilə bağlıdır: məlumat bir dəfə daxil edilir,
          hesablama, maliyyə və hesabatlarda avtomatik görünür.
        </p>
      </div>
      <div className="lp-module-grid">
        {modules.map((m, i) => (
          <article className="lp-module" key={m.title}>
            <div className="lp-module-top">
              <span className="feature-icon">{m.icon}</span>
              <span className="feature-number">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3>{m.title}</h3>
            <p>{m.text}</p>
            <ul>
              {m.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
