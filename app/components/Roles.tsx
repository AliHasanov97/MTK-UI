import { roles } from "../content";

export function Roles() {
  return (
    <section className="roles-section section-wrap" id="haqqinda">
      <div className="roles-card">
        <div className="roles-copy">
          <div className="eyebrow">BİR MTK-NIN İŞ AXINI</div>
          <h2>
            Bir komanda.
            <br />
            <span>Ortaq mənzərə.</span>
          </h2>
          <p>
            İdarəçi, mühasib, sakin və işçilər məhəllədəki binaların gündəlik
            idarəçiliyində öz rollarına uyğun iştirak edir.
          </p>
          <div className="role-tags">
            {roles.map((role) => (
              <span key={role}>{role}</span>
            ))}
          </div>
        </div>
        <div className="roles-graphic">
          <div className="role-orbit role-orbit-a" />
          <div className="role-orbit role-orbit-b" />
          <div className="role-center">
            MTK
          </div>
          <div className="role-node node-top">
            <span>⌂</span>
          </div>
          <div className="role-node node-right">
            <span>₼</span>
          </div>
          <div className="role-node node-bottom">
            <span>◎</span>
          </div>
          <div className="role-node node-left">
            <span>↗</span>
          </div>
        </div>
      </div>
    </section>
  );
}
