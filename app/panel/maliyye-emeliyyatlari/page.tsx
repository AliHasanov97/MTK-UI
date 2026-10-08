import Link from "next/link";
import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";

const links = [
  { href: "/panel/maliyye-emeliyyatlari/odenisler", label: "Ödənişlərin daxil edilməsi" },
  { href: "/panel/maliyye-emeliyyatlari/tariflar", label: "Tariflər" },
  { href: "/panel/maliyye-emeliyyatlari/xercler", label: "Xərclərin daxil edilməsi" },
  { href: "/panel/maliyye-emeliyyatlari/salinmalar", label: "Satınalmalar" },
  {
    href: "/panel/maliyye-emeliyyatlari/elave-gelirler",
    label: "Əlavə gəlirlərin daxil edilməsi",
  },
];

export default function MaliyyeEmeliyyatlariPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Maliyyə əməliyyatları</h1>
        <p className="panel-page-lead">Aşağıdakı əməliyyatlardan birini seçin.</p>
        <div className="panel-card-grid">
          {links.map((link) => (
            <Link className="panel-card" href={link.href} key={link.href}>
              <h3>{link.label}</h3>
            </Link>
          ))}
        </div>
      </div>
    </RequireRole>
  );
}
