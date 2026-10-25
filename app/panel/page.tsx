"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth/AuthContext";
import { NAV_MODULES } from "./nav";

/** Bölməsi olmayan modullar üçün kartın altında göstərilən qısa izah. */
const MODULE_HINTS: Record<string, string> = {
  "/panel/maliyye-emeliyyatlari/tariflar": "Tarif parametrləri və qiymətlər",
  "/panel/tranzaksiyalar": "Ödəniş və sənəd əməliyyatları",
  "/panel/muracietler": "Sakin müraciətlərinin izlənməsi",
  "/panel/xeberler": "Sayt xəbərlərinin idarəsi",
  "/panel/profil": "Şəxsi hesab məlumatları",
};

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
        Bu, idarəetmə panelinizin ümumi baxışıdır. Aşağıdakı modullar rolunuza
        uyğun olaraq göstərilir.
      </p>
      <div className="panel-card-grid">
        {modules.map((mod, index) => (
          <Link className="panel-card" href={mod.href} key={mod.href}>
            <span className="panel-card-top">
              <span className="panel-card-icon" aria-hidden="true">
                {mod.icon}
              </span>
              <span className="panel-card-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </span>
            <h3>{mod.label}</h3>
            {mod.tabs ? (
              <span className="panel-card-tabs">
                <span className="panel-card-tabs-label">Bölmələr</span>
                <span className="panel-card-chips">
                  {mod.tabs.map((tab) => (
                    <span className="panel-card-chip" key={tab.href}>
                      {tab.label}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              <p className="panel-card-desc">
                {MODULE_HINTS[mod.href] ?? "Modul səhifəsinə keçin"}
              </p>
            )}
            <span className="panel-card-cta">
              Modula keç
              <span aria-hidden="true">→</span>
            </span>
            <span className="panel-card-ghost" aria-hidden="true">
              {mod.icon}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
