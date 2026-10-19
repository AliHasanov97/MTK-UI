import "../landing.css";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackToTop } from "./BackToTop";
import { MobileNav } from "./MobileNav";

/** Landing və bütün ictimai səhifələr üçün ortaq çərçivə (tund rejim yalnız burada tətbiq olunur). */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="lp-root">
      <Header />
      <main id="top">{children}</main>
      <Footer />
      <BackToTop />
      <MobileNav />
    </div>
  );
}
