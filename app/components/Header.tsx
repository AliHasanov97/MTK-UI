import { Logo } from "./Logo";
import { HeaderAuth } from "./HeaderAuth";
import { getCompanyName } from "../lib/api/company";

export async function Header() {
  const name = await getCompanyName();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Logo name={name} />
        <nav className="desktop-nav" aria-label="Əsas menyu">
          <a href="#imkanlar">İmkanlar</a>
          <a href="#nece-isleyir">Necə işləyir</a>
          <a href="#rollar">Rollar</a>
          <a href="#haqqinda">Haqqımızda</a>
          <a href="#faq">FAQ</a>
          <a href="#elaqe">Əlaqə</a>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  );
}
