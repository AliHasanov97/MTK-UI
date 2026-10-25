import { steps } from "../content";
import { SectionHead } from "./SectionHead";

export function Flow() {
  return (
    <section className="c-section" id="nece-isleyir">
      <div className="c-wrap">
        <SectionHead
          title="Necə işləyir"
          subtitle="Qeydiyyatdan hesabata dörd addım"
        />

        <div className="c-steps c-steps-cols">
          {steps.map((s, i) => (
            <div className="c-step" key={s.title}>
              <span className="c-step-num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
