import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { TrustStrip } from "./components/TrustStrip";
import { Features } from "./components/Features";
import { Workflow } from "./components/Workflow";
import { Roles } from "./components/Roles";
import { Closing } from "./components/Closing";
import { Footer } from "./components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <Features />
        <Workflow />
        <Roles />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
