"use client";

import { useState } from "react";
import { OdenisQrafikiView } from "./OdenisQrafikiView";
import { UmumiHesabatView } from "./UmumiHesabatView";

type Tab = "qrafik" | "umumi";

export function HesabatlarView() {
  const [tab, setTab] = useState<Tab>("qrafik");

  return (
    <div className="panel-page">
      <div className="panel-page-head">
        <div>
          <h1>Hesabatlar</h1>
          <p className="panel-page-lead">
            {tab === "qrafik"
              ? "Bütün mənzil və qarajların illik ödəniş qrafiki — hər ay üçün ödənilib/ödənilməyib."
              : "Seçilmiş ayın gəlir/xərc hesabatı — çap edilə bilən formatda."}
          </p>
        </div>
      </div>

      <div className="ledger-segmented hesabat-tab-switch" role="group" aria-label="Hesabat növü">
        <button
          type="button"
          aria-pressed={tab === "qrafik"}
          className={tab === "qrafik" ? "active" : ""}
          onClick={() => setTab("qrafik")}
        >
          Ödəniş qrafiki
        </button>
        <button
          type="button"
          aria-pressed={tab === "umumi"}
          className={tab === "umumi" ? "active" : ""}
          onClick={() => setTab("umumi")}
        >
          Ümumi hesabat
        </button>
      </div>

      {tab === "qrafik" ? <OdenisQrafikiView /> : <UmumiHesabatView />}
    </div>
  );
}
