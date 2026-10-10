import Link from "next/link";
import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roleConstants";
import { EmployeeDetailView } from "./EmployeeDetailView";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <Link className="owner-link" href="/panel/hr/isciler">
              ← İşçilərə qayıt
            </Link>
            <h1>İşçi kartı</h1>
            <p className="panel-page-lead">Şəxsi məlumatlar, iş qrafiki, əvvəlki iş yerləri və təhsil.</p>
          </div>
        </div>
        <EmployeeDetailView employeeId={id} />
      </div>
    </RequireRole>
  );
}
