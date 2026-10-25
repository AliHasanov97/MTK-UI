"use client";

import Link from "next/link";
import { useEffect } from "react";
import { NAV_MODULES } from "../../panel/nav";
import "../../panel-dark.css";
import "../../panel-civic.css";

const HINTS: Record<string, string> = {
  "/panel/tranzaksiyalar": "Ödəniş və sənəd əməliyyatları",
  "/panel/muracietler": "Sakin müraciətlərinin izlənməsi",
  "/panel/xeberler": "Sayt xəbərlərinin idarəsi",
};

const modules = NAV_MODULES.filter(
  (mod) =>
    mod.href !== "/panel" &&
    mod.href !== "/panel/profil" &&
    mod.href !== "/panel/maliyye-emeliyyatlari/tariflar" &&
    mod.label !== "Müqavilələr",
);

export default function DashboardPreviewPage() {
  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get("theme");
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.area = "panel";
  }, []);

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar" aria-hidden="true">
        <div className="panel-sidebar-top">
          <div className="panel-sidebar-brand">
            <span className="brand">MTK</span>
            <small>İdarəetmə paneli</small>
          </div>
        </div>
        <nav className="panel-nav">
          <span className="panel-nav-item active">
            <span aria-hidden="true">◎</span>
            Ümumi baxış
          </span>
          {modules.map((mod) => (
            <span className="panel-nav-item" key={mod.href}>
              <span aria-hidden="true">{mod.icon}</span>
              {mod.label}
            </span>
          ))}
        </nav>
      </aside>

      <div className="panel-main">
        <main className="panel-content">
          <div className="panel-page">
            <h1>Xoş gəldiniz, Əli Həsənov</h1>
            <p className="panel-page-lead">
              Bu, idarəetmə panelinizin ümumi baxışıdır. Aşağıdakı modullar
              rolunuza uyğun olaraq göstərilir.
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
                      {HINTS[mod.href] ?? "Modul səhifəsinə keçin"}
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
        </main>
      </div>
    </div>
  );
}
