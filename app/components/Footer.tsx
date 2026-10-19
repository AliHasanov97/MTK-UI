import { Logo } from "./Logo";
import { getCompanyName } from "../lib/api/company";

export async function Footer() {
  const name = await getCompanyName();
  return (
    <footer className="site-footer">
      <Logo name={name} variant="footer" />
      <span>Mənzil-Tikinti Kooperativi İdarəetmə Sistemi</span>
      <span>© 2026 {name}. Bütün hüquqlar qorunur.</span>
    </footer>
  );
}
