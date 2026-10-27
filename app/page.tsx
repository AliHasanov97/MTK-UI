import { SiteShell } from "./components/SiteShell";
import { Hero } from "./components/Hero";
import { Modules } from "./components/Modules";
import { PromoVideo } from "./components/PromoVideo";
import { Flow } from "./components/Flow";
import { AndroidApp } from "./components/AndroidApp";
import { Closing } from "./components/Closing";
import { LatestNews, Residents } from "./components/Sections";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <Modules />
      <PromoVideo />
      <Residents />
      <Flow />
      <AndroidApp />
      <LatestNews />
      <Closing />
    </SiteShell>
  );
}
