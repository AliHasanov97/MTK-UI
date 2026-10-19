"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const items = [
  { href: "/", label: "Ana səhifə", icon: icon(<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />) },
  {
    href: "/telimat",
    label: "Təlimat",
    icon: icon(<path d="M2 5a1 1 0 0 1 1-1h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H3a1 1 0 0 1-1-1zM22 5a1 1 0 0 0-1-1h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7a1 1 0 0 0 1-1z" />),
  },
  {
    href: "/xeberler",
    label: "Xəbərlər",
    icon: icon(<path d="M4 4h13a1 1 0 0 1 1 1v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2zM18 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4" />),
  },
  {
    href: "/haqqimizda",
    label: "Haqqımızda",
    icon: icon(<><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></>),
  },
  {
    href: "/elaqe",
    label: "Əlaqə",
    icon: icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  },
];

/** Telefonda (≤900px) ekranın altında sabit naviqasiya; masaüstündə gizlidir. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobil menyu">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "bottom-nav-active" : undefined} aria-current={active ? "page" : undefined}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
