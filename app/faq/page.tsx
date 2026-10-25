import type { Metadata } from "next";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { Faq } from "../components/Sections";
import { Closing } from "../components/Closing";

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
        lead="Giriş, borc hesablaması, müraciətlər və hesabatlar haqqında qısa cavablar."
        crumbs={[{ label: "FAQ" }]}
      />
      <Faq />
      <Closing />
    </SiteShell>
  );
}
