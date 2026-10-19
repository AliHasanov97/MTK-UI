import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { guides } from "../guides";
import { ROLE_LABELS } from "../lib/auth/roleConstants";

export const metadata: Metadata = { title: "İstifadə təlimatı" };

export default function GuidesPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="TƏLİMAT"
        title={
          <>
            Sistemdən istifadə <span>təlimatı.</span>
          </>
        }
        lead="Hər bölmə üçün addım-addım izahat. Bölməni seçin və ya rolunuza uyğun təlimatlara baxın."
        crumbs={[{ label: "Təlimat" }]}
      />
      <section className="lp-guide-index section-wrap">
        <div className="lp-guide-grid">
          {guides.map((g) => (
            <Link key={g.slug} href={`/telimat/${g.slug}`} className="lp-guide-card">
              <span className="feature-icon">{g.icon}</span>
              <h3>{g.title}</h3>
              <p>{g.summary}</p>
              <div className="role-tags">
                {g.roles.map((r) => (
                  <span key={r}>{ROLE_LABELS[r]}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
