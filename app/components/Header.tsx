import Link from "next/link";
import { BuildingIcon } from "./icons";
import { HeaderAuth } from "./HeaderAuth";
import { ThemeToggle } from "./ThemeToggle";
import { getCompanyName } from "../lib/api/company";

const links = [
  { href: "/sistem", label: "Sistem" },
  { href: "/telimat", label: "Təlimat" },
  { href: "/xeberler", label: "Xəbərlər" },
  { href: "/haqqimizda", label: "Haqqımızda" },
  { href: "/faq", label: "FAQ" },
  { href: "/elaqe", label: "Əlaqə" },
];

export async function Header() {
  const name = await getCompanyName();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="c-brand" href="/" aria-label={`${name} ana səhifə`}>
          <span className="c-brand-mark" aria-hidden="true">
            <BuildingIcon size={20} />
          </span>
          <span className="c-brand-text">
            <strong>{name}</strong>
            <small>İdarəetmə sistemi</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Əsas menyu">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
