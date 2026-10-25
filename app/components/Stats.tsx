import { stats } from "../content";

export function Stats() {
  return (
    <section className="c-section-tight">
      <div className="c-wrap">
        <div className="c-statbar" aria-label="Sistem rəqəmlərlə">
          {stats.map((s) => (
            <div className="c-stat" key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
