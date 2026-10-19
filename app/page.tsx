import { SiteShell } from "./components/SiteShell";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Modules } from "./components/Modules";
import { Closing } from "./components/Closing";
import { LatestNews, Residents } from "./components/Sections";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <Stats />
      <Modules />
      <Residents />
      <LatestNews />
      <Closing />
    </SiteShell>
  );
}
