"use client";

import { useAuth } from "../lib/auth/AuthContext";
import { NAV_ITEMS } from "./nav";

export default function PanelOverviewPage() {
  const auth = useAuth();
  if (auth.status !== "authenticated") return null;

  const sections = NAV_ITEMS.filter(
    (item) =>
      item.href !== "/panel" &&
      (!item.roles || item.roles.some((role) => auth.user.roles.includes(role))),
  );

  return (
    <div className="panel-page">
      <h1>Xoş gəldiniz, {auth.user.name ?? auth.user.username}</h1>
      <p className="panel-page-lead">
        Bu, MTK idarəetmə panelinizin ümumi baxışıdır. Aşağıdakı bölmələr rolunuza
        uyğun olaraq göstərilir.
      </p>
      <div className="panel-card-grid">
        {sections.map((item) => (
          <div className="panel-card" key={item.href}>
            <span className="panel-card-icon" aria-hidden="true">
              {item.icon}
            </span>
            <h3>{item.label}</h3>
            <p>Tezliklə burada {item.label.toLowerCase()} məlumatları olacaq.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
