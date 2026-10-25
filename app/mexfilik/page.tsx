import type { Metadata } from "next";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";

export const metadata: Metadata = { title: "Məxfilik və istifadə şərtləri" };

export default function PrivacyPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="MƏXFİLİK"
        title={
          <>
            Məxfilik və <span>istifadə şərtləri.</span>
          </>
        }
        crumbs={[{ label: "Məxfilik" }]}
      />

      <section className="c-section">
        <div className="c-wrap">
          <article className="c-prose c-prose-card c-prose-narrow">
            <h2>Toplanan məlumat</h2>
            <p>
              Sistemdə kooperativin fəaliyyəti üçün lazım olan məlumatlar saxlanılır: sahiblər, mənzillər,
              müqavilələr, ödənişlər, işçi məlumatları və müraciətlər.
            </p>
            <h2>Giriş və səlahiyyətlər</h2>
            <p>
              Giriş mərkəzləşmiş autentifikasiya ilə həyata keçirilir. Hər istifadəçi yalnız rolunun icazə
              verdiyi bölmələri görür.
            </p>
            <h2>Audit</h2>
            <p>Sistemdəki dəyişikliklər audit qeydlərində saxlanılır: kim, nə vaxt, nəyi dəyişdi.</p>
            <h2>İstifadə qaydaları</h2>
            <ul>
              <li>Giriş məlumatlarınızı üçüncü şəxslərə verməyin.</li>
              <li>Sistemdəki məlumatları yalnız vəzifə öhdəliyiniz çərçivəsində istifadə edin.</li>
              <li>Səhv və ya şübhəli fəaliyyət görsəniz, kooperativin idarəsinə bildirin.</li>
            </ul>
            <p>
              <small>Bu mətn ümumi xarakterlidir və hüquqi baxımdan yoxlanıldıqdan sonra təsdiq edilməlidir.</small>
            </p>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
