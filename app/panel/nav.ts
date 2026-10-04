import { ROLES, type Role } from "../lib/auth/roleConstants";

export type SubPage = {
  href: string;
  label: string;
};

export type NavModule = {
  href: string;
  label: string;
  icon: string;
  roles?: Role[];
  /** When present, this module gets a secondary tab strip for these sub-pages. */
  tabs?: SubPage[];
};

/**
 * The sidebar shows exactly one row per module — never per page. As more
 * modules (HR, Anbar, ...) are added over time, this list only grows by a
 * row each; a module's own sub-pages live in its secondary tab strip
 * instead, so the sidebar never needs scrolling or an accordion.
 */
export const NAV_MODULES: NavModule[] = [
  { href: "/panel", label: "Ümumi baxış", icon: "◎" },
  {
    href: "/panel/binalar",
    label: "Binalar",
    icon: "⌂",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER],
    tabs: [
      { href: "/panel/binalar/bina-siyahisi", label: "Binalar" },
      { href: "/panel/binalar", label: "Mənzillər" },
      { href: "/panel/binalar/qarajlar", label: "Qarajlar" },
      { href: "/panel/binalar/sahibler", label: "Sahiblər" },
    ],
  },
  {
    href: "/panel/inventar/anbar",
    label: "İnventar",
    icon: "▦",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER],
    tabs: [
      { href: "/panel/inventar/anbar", label: "Anbar" },
      { href: "/panel/inventar/materiallar", label: "Materiallar" },
      { href: "/panel/inventar/daxilolmalar", label: "Daxilolmalar" },
      { href: "/panel/inventar/cixarislar", label: "Çıxarışlar" },
    ],
  },
  {
    href: "/panel/muqavileler",
    label: "Əməliyyatlar",
    icon: "₼",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT],
    tabs: [
      { href: "/panel/muqavileler", label: "Müqavilələr" },
      { href: "/panel/tedarukculer", label: "Tədarükçülər" },
      { href: "/panel/borclar", label: "Borclar" },
      { href: "/panel/maliyye-emeliyyatlari", label: "Maliyyə əməliyyatları" },
    ],
  },
  {
    // Owner gets its own narrow entry into the same pages the staff group above
    // links to — Borclar (every owner's debt) and Maliyyə əməliyyatları (xərc/gəlir
    // entry forms) are deliberately left out, so this can't just widen that
    // group's `roles` instead (tabs have no per-tab role of their own).
    href: "/panel/muqavileler",
    label: "Müqavilələr",
    icon: "₼",
    roles: [ROLES.OWNER],
    tabs: [
      { href: "/panel/muqavileler", label: "Müqavilələr" },
      { href: "/panel/tedarukculer", label: "Tədarükçülər" },
    ],
  },
  {
    href: "/panel/maliyye-emeliyyatlari/tariflar",
    label: "Tariflər",
    icon: "₼",
    roles: [ROLES.OWNER],
  },
  {
    href: "/panel/tranzaksiyalar",
    label: "Tranzaksiyalar",
    icon: "⇄",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER],
  },
  {
    href: "/panel/hesabatlar",
    label: "Hesabatlar",
    icon: "▩",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER],
  },
  {
    href: "/panel/muraciyetler",
    label: "Müraciətlər",
    icon: "✳",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER],
  },
  {
    href: "/panel/hr/isciler",
    label: "HR",
    icon: "◈",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.EMPLOYEE],
    tabs: [
      { href: "/panel/hr/isciler", label: "İşçilər" },
      { href: "/panel/hr/erizeler", label: "Ərizələr" },
      { href: "/panel/hr/emrler", label: "Əmrlər" },
      { href: "/panel/hr/davamiyyet", label: "Davamiyyət" },
    ],
  },
  {
    href: "/panel/istifadeciler",
    label: "İdentifikasiya",
    icon: "◐",
    roles: [ROLES.ADMIN],
    tabs: [
      { href: "/panel/istifadeciler", label: "İstifadəçilər" },
      { href: "/panel/rollar", label: "Rollar" },
      { href: "/panel/qruplar", label: "Qruplar" },
    ],
  },
  {
    href: "/panel/profil",
    label: "Mənim profilim",
    icon: "☺",
    roles: [ROLES.OWNER],
  },
  {
    href: "/panel/idareetme",
    label: "İdarəetmə",
    icon: "⚙",
    roles: [ROLES.ADMIN],
    tabs: [
      { href: "/panel/idareetme", label: "Sistem idarəetməsi" },
      { href: "/panel/audit", label: "Audit qeydləri" },
    ],
  },
];
