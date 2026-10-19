import { stats } from "../content";

export function Stats() {
  return (
    <section className="lp-stats" aria-label="Sistem rəqəmlərlə">
      <div className="section-wrap lp-stats-inner">
        {stats.map((s) => (
          <div key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
