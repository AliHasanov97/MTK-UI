import { ROLES, type Role } from "../lib/auth/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: Role[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ümumi",
    items: [{ href: "/panel", label: "Ümumi baxış", icon: "◎" }],
  },
  {
    label: "Binalar modulu",
    items: [
      {
        href: "/panel/binalar",
        label: "Binalar və mənzillər",
        icon: "⌂",
        roles: [ROLES.ADMIN, ROLES.STAFF],
      },
    ],
  },
  {
    label: "Maliyyə modulu",
    items: [
      {
        href: "/panel/hesablar",
        label: "Hesablar və ödənişlər",
        icon: "₼",
        roles: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.OWNER],
      },
      {
        href: "/panel/maliyye",
        label: "Maliyyə şəffaflığı",
        icon: "↗",
        roles: [ROLES.ADMIN, ROLES.ACCOUNTANT],
      },
    ],
  },
  {
    label: "Əməliyyatlar modulu",
    items: [
      {
        href: "/panel/muraciyetler",
        label: "Müraciətlər",
        icon: "✳",
        roles: [ROLES.ADMIN, ROLES.STAFF, ROLES.OWNER],
      },
    ],
  },
  {
    label: "İdentifikasiya modulu",
    items: [
      {
        href: "/panel/istifadeciler",
        label: "İstifadəçilər",
        icon: "◐",
        roles: [ROLES.ADMIN],
      },
      {
        href: "/panel/rollar",
        label: "Rollar",
        icon: "◆",
        roles: [ROLES.ADMIN],
      },
      {
        href: "/panel/qruplar",
        label: "Qruplar",
        icon: "▣",
        roles: [ROLES.ADMIN],
      },
      {
        href: "/panel/audit",
        label: "Audit qeydləri",
        icon: "▤",
        roles: [ROLES.ADMIN],
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
