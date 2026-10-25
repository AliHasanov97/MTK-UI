import { roles } from "../content";
import { SectionHead } from "./SectionHead";

export function Roles() {
  return (
    <section className="c-section" id="rollar">
      <div className="c-wrap">
        <SectionHead
          title="Kimlər üçündür"
          subtitle="Bir komanda, hər kəs öz rolunda"
        />

        <div className="c-role-grid">
          {roles.map((r) => (
            <article className="c-role" key={r.name}>
              <h3>{r.name}</h3>
              <p>{r.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
