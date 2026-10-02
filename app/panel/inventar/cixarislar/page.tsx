import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";

export default function CixarislarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Çıxarışlar</h1>
        <p className="panel-page-lead">Tezliklə burada anbardan çıxarışlar olacaq.</p>
      </div>
    </RequireRole>
  );
}
