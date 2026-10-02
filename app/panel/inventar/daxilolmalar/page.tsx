import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";

export default function DaxilolmalarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Daxilolmalar</h1>
        <p className="panel-page-lead">Tezliklə burada anbara daxilolmalar olacaq.</p>
      </div>
    </RequireRole>
  );
}
