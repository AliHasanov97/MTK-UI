import { Arrow } from "./Arrow";

const steps = [
  {
    icon: "⌂",
    label: "ADDIM 01",
    title: "Mənzil qeydiyyatı",
    text: "Blok, sahə və sahiblik məlumatları",
  },
  {
    icon: "₼",
    label: "ADDIM 02",
    title: "Aylıq hesablamalar",
    text: "Tarifə əsasən avtomatik hesablanır",
  },
  {
    icon: "↗",
    label: "ADDIM 03",
    title: "Ödəniş və hesabat",
    text: "İzlənə bilən maliyyə tarixçəsi",
  },
];

export function Workflow() {
  return (
    <section className="workflow" id="nece-isleyir">
      <div className="workflow-inner section-wrap">
        <div className="workflow-copy">
          <div className="eyebrow eyebrow-light">SADƏ İŞ AXINI</div>
          <h2>
            Gündəlik işlər
            <br />
            bir-birinə <span>bağlanır.</span>
          </h2>
          <p>
            Mənzil məlumatı hesablamalara, ödəniş isə maliyyə hesabatına
            bağlanır. Məlumatı təkrar daxil etmədən ümumi mənzərəni izləyin.
          </p>
          <a className="button button-light" href="mailto:info@mtk.az">
            Ətraflı məlumat al <Arrow />
          </a>
        </div>
        <div className="workflow-visual">
          <div className="flow-line" />
          {steps.map((step) => (
            <div className="flow-step" key={step.label}>
              <span className="flow-icon">{step.icon}</span>
              <div>
                <small>{step.label}</small>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
              <span className="flow-check">✓</span>
            </div>
          ))}
          <div className="flow-footnote">
            <span>✳</span> Hər əməliyyatın aydın tarixçəsi
          </div>
        </div>
      </div>
    </section>
  );
}
