import type { Metadata } from "next";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { About, Faq } from "../components/Sections";
import { Stats } from "../components/Stats";
import { Closing } from "../components/Closing";

export const metadata: Metadata = { title: "Haqqımızda" };

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="HAQQIMIZDA"
        title={
          <>
            Biz kimik və <span>nə edirik.</span>
          </>
        }
        lead="Kooperativin gündəlik işini şəffaf və izlənə bilən etmək üçün qurulmuş idarəetmə sistemi."
        crumbs={[{ label: "Haqqımızda" }]}
      />
      <About />
      <Stats />
      <Faq />
      <Closing />
    </SiteShell>
  );
}
