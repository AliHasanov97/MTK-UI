import Link from "next/link";
import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";

const sections = [
  {
    title: "Gəlir və xərc əməliyyatları",
    links: [
      { href: "/panel/maliyye-emeliyyatlari/odenisler", label: "Ödənişlərin daxil edilməsi" },
      { href: "/panel/maliyye-emeliyyatlari/xercler", label: "Xərclərin daxil edilməsi" },
      { href: "/panel/maliyye-emeliyyatlari/elave-gelirler", label: "Əlavə gəlirlərin daxil edilməsi" },
    ],
  },
  {
    title: "Təchizat və tariflər",
    links: [
      { href: "/panel/maliyye-emeliyyatlari/tariflar", label: "Tariflər" },
      { href: "/panel/maliyye-emeliyyatlari/salinmalar", label: "Satınalmalar" },
    ],
  },
  {
    title: "Əmək haqqı idarəetməsi",
    links: [
      { href: "/panel/maliyye-emeliyyatlari/emek-haqqi", label: "Əmək haqqı" },
      { href: "/panel/maliyye-emeliyyatlari/vacation-pays", label: "Məzuniyyət ödənişləri" },
    ],
  },
];

export default function MaliyyeEmeliyyatlariPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Maliyyə əməliyyatları</h1>
        <p className="panel-page-lead">Aşağıdakı əməliyyat qruplarından birini seçin.</p>

        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#374151" }}>
              {section.title}
            </h2>
            <div className="panel-card-grid">
              {section.links.map((link) => (
                <Link className="panel-card" href={link.href} key={link.href}>
                  <h3>{link.label}</h3>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </RequireRole>
  );
}
