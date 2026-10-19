import type { Metadata } from "next";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { Faq } from "../components/Sections";

export const metadata: Metadata = { title: "Tez-tez verilən suallar" };

export default function FaqPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Tez-tez verilən <span>suallar.</span>
          </>
        }
        crumbs={[{ label: "FAQ" }]}
      />
      <Faq />
    </SiteShell>
  );
}
