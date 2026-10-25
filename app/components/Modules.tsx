import Link from "next/link";
import { modules } from "../content";
import { SectionHead } from "./SectionHead";
import {
  AnalyticsIcon,
  BuildingIcon,
  HrIcon,
  InventoryIcon,
  ReceiptIcon,
  ShieldIcon,
  SupportIcon,
  SwapIcon,
} from "./icons";

function moduleIcon(title: string) {
  if (title.includes("Binalar")) return <BuildingIcon size={19} />;
  if (title.includes("Müqavilə")) return <ReceiptIcon size={19} />;
  if (title.includes("Tranzaksiya")) return <SwapIcon size={19} />;
  if (title.includes("Hesabat")) return <AnalyticsIcon size={19} />;
  if (title.includes("İnventar")) return <InventoryIcon size={19} />;
  if (title.startsWith("HR")) return <HrIcon size={19} />;
  if (title.includes("Müraciət")) return <SupportIcon size={19} />;
  return <ShieldIcon size={19} />;
}

function moduleAccent(title: string) {
  if (title.includes("Müqavilə") || title.includes("Tranzaksiya") || title.includes("Hesabat")) {
    return "is-terracotta";
  }
  if (title.includes("Binalar") || title.includes("İnventar") || title.includes("Müraciət")) {
    return "is-olive";
  }
  return "is-forest";
}

export function Modules({ detailed = false }: { detailed?: boolean }) {
  return (
    <section className="c-section" id="imkanlar">
      <div className="c-wrap">
        <SectionHead
          title="Sistemin imkanları"
          subtitle="Səkkiz modul, bir ortaq məlumat bazası"
        />

        <div className="c-module-grid">
          {modules.map((m, i) => (
            <article className="c-module" key={m.title}>
              <div className="c-module-top">
                <span className={`c-module-icon ${moduleAccent(m.title)}`} aria-hidden="true">
                  {moduleIcon(m.title)}
                </span>
                <span className="c-module-num">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3>{m.title}</h3>
              <p>{m.text}</p>
              {detailed && (
                <ul className="c-module-points">
                  {m.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        {!detailed && (
          <div className="c-more-row">
            <Link className="c-text-link" href="/sistem">
              Sistem haqqında ətraflı →
            </Link>
            <Link className="c-text-link" href="/telimat">
              İstifadə təlimatları →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
