import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { UmumiHesabatView } from "../UmumiHesabatView";

// ADMIN/ACCOUNTANT only: same scoping as Borclar — the search endpoints aren't
// owner-scoped, so an OWNER role here would see every property's payment history.
export default function UmumiHesabatPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Hesabatlar</h1>
        <p className="panel-page-lead">
          Seçilmiş ayın gəlir/xərc hesabatı — çap edilə bilən formatda.
        </p>
        <UmumiHesabatView />
      </div>
    </RequireRole>
  );
}
