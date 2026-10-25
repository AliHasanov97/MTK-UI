"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BookIcon, HomeIcon, ListIcon, NewsIcon, PhoneIcon } from "./icons";

const items: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Əsas", icon: <HomeIcon size={21} /> },
  { href: "/telimat", label: "Təlimat", icon: <BookIcon size={21} /> },
  { href: "/xeberler", label: "Xəbərlər", icon: <NewsIcon size={21} /> },
  { href: "/haqqimizda", label: "Haqqımızda", icon: <ListIcon size={21} /> },
  { href: "/elaqe", label: "Əlaqə", icon: <PhoneIcon size={21} /> },
];

/** Telefonda ekranın altında üzən naviqasiya — APK-dakı dock ilə eyni. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="c-bottom-nav" aria-label="Mobil menyu">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
