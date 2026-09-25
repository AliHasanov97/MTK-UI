import { Fragment } from "react";

const items = [
  { icon: "✳", label: "MTK maliyyəsi" },
  { icon: "⌂", label: "Məhəllə üzrə binalar" },
  { icon: "↗", label: "Mənzil və hesablar" },
  { icon: "◎", label: "Gündəlik idarəetmə" },
];

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Sistemin əsas istiqamətləri">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <i />}
          <div>
            <span>{item.icon}</span> {item.label}
          </div>
        </Fragment>
      ))}
    </section>
  );
}
