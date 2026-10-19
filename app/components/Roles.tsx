import { roles } from "../content";

export function Roles() {
  return (
    <section className="lp-roles section-wrap" id="rollar">
      <div className="section-heading">
        <div>
          <div className="eyebrow">KİMLƏR ÜÇÜNDÜR</div>
          <h2>
            Bir komanda,
            <br />
            <span>hər kəs öz rolunda.</span>
          </h2>
        </div>
        <p>
          Giriş rola görə məhdudlaşır: istifadəçi yalnız səlahiyyətinə aid
          bölmələri görür.
        </p>
      </div>
      <div className="lp-role-grid">
        {roles.map((r) => (
          <article key={r.name}>
            <h3>{r.name}</h3>
            <p>{r.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
