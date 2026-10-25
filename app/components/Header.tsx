import Image from "next/image";
import Link from "next/link";
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
          <Image src="/logo.png" alt="" width={186} height={106} priority className="c-brand-logo" />
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
