import type { Metadata } from "next";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { Modules } from "../components/Modules";
import { Flow } from "../components/Flow";
import { Roles } from "../components/Roles";
import { Compare, Security } from "../components/Sections";
import { Closing } from "../components/Closing";

export const metadata: Metadata = { title: "Sistem haqqında" };

export default function SystemPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="SİSTEM HAQQINDA"
        title={
          <>
            Sistem necə qurulub <span>və nə verir.</span>
          </>
        }
        lead="Modullar, iş axını, rollar və təhlükəsizlik — bir səhifədə."
        crumbs={[{ label: "Sistem haqqında" }]}
      />
      <Modules />
      <Compare />
      <Flow />
      <Roles />
      <Security />
      <Closing />
    </SiteShell>
  );
}
