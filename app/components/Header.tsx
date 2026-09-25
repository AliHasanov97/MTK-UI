import { Logo } from "./Logo";
import { HeaderAuth } from "./HeaderAuth";

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Əsas menyu">
          <a href="#imkanlar">İmkanlar</a>
          <a href="#nece-isleyir">Necə işləyir</a>
          <a href="#haqqinda">Kimlər üçündür</a>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  );
}
