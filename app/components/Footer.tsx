import Link from "next/link";
import { Logo } from "./Logo";
import { getCompanyName } from "../lib/api/company";

export async function Footer() {
  const name = await getCompanyName();
  return (
    <footer className="site-footer">
      <Logo name={name} href="/" variant="footer" />
      <nav className="lp-footer-links" aria-label="Alt menyu">
        <Link href="/sistem">Sistem</Link>
        <Link href="/telimat">Təlimat</Link>
        <Link href="/xeberler">Xəbərlər</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/elaqe">Əlaqə</Link>
        <Link href="/mexfilik">Məxfilik</Link>
      </nav>
      <span>© 2026 {name}. Bütün hüquqlar qorunur.</span>
    </footer>
  );
}
