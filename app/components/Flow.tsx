import { steps } from "../content";

export function Flow() {
  return (
    <section className="lp-flow" id="nece-isleyir">
      <div className="section-wrap lp-flow-inner">
        <div className="lp-flow-head">
          <div className="eyebrow eyebrow-light">NECƏ İŞLƏYİR</div>
          <h2>
            Qeydiyyatdan hesabata
            <br />
            <span>qırılmayan zəncir.</span>
          </h2>
        </div>
        <ol className="lp-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="lp-step-icon">{s.icon}</span>
              <small>ADDIM {String(i + 1).padStart(2, "0")}</small>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
