import "./landing.css";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Modules } from "./components/Modules";
import { Flow } from "./components/Flow";
import { Roles } from "./components/Roles";
import { Closing } from "./components/Closing";
import { Footer } from "./components/Footer";
import { BackToTop } from "./components/BackToTop";
import { About, Changelog, Compare, Contact, Faq, Residents, Security } from "./components/Sections";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Stats />
        <Modules />
        <Compare />
        <Flow />
        <Residents />
        <Roles />
        <Security />
        <About />
        <Changelog />
        <Faq />
        <Contact />
        <Closing />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
