import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { Contact } from "../components/Sections";
import { Closing } from "../components/Closing";

export const metadata: Metadata = { title: "Əlaqə" };

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="ƏLAQƏ"
        title={
          <>
            Bizimlə <span>əlaqə saxlayın.</span>
          </>
        }
        lead="Sualınız, giriş tələbiniz və ya təklifiniz varsa, yazın və ya zəng edin."
        crumbs={[{ label: "Əlaqə" }]}
      />

      <Contact />

      <section className="c-section">
        <div className="c-wrap">
          <div className="c-prose c-prose-card">
            <h2>Tez-tez müraciət səbəbləri</h2>
            <ul>
              <li>Sistemə giriş hesabı almaq — kooperativin idarəsinə yazın.</li>
              <li>
                Sistemdən istifadə ilə bağlı sual — əvvəlcə <Link href="/telimat">təlimata</Link> və{" "}
                <Link href="/faq">FAQ</Link>-a baxın.
              </li>
              <li>Borc və ödəniş məsələləri — panelin “Borclar” və “Tranzaksiyalar” bölməsində məlumat var.</li>
            </ul>
          </div>
        </div>
      </section>

      <Closing />
    </SiteShell>
  );
}
