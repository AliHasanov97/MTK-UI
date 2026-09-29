"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth/AuthContext";
import { NAV_MODULES } from "./nav";

export default function PanelOverviewPage() {
  const auth = useAuth();
  if (auth.status !== "authenticated") return null;

  const modules = NAV_MODULES.filter(
    (mod) =>
      mod.href !== "/panel" &&
      (!mod.roles || mod.roles.some((role) => auth.user.roles.includes(role))),
  );

  return (
    <div className="panel-page">
      <h1>Xoş gəldiniz, {auth.user.name ?? auth.user.username}</h1>
      <p className="panel-page-lead">
        Bu, MTK idarəetmə panelinizin ümumi baxışıdır. Aşağıdakı modullar rolunuza
        uyğun olaraq göstərilir.
      </p>
      <div className="panel-card-grid">
        {modules.map((mod) => (
          <Link className="panel-card" href={mod.href} key={mod.href}>
            <span className="panel-card-icon" aria-hidden="true">
              {mod.icon}
            </span>
            <h3>{mod.label}</h3>
            {mod.tabs && (
              <p>{mod.tabs.map((tab) => tab.label).join(" · ")}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
