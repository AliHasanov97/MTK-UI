import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";

export default function MateriallarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Materiallar</h1>
        <p className="panel-page-lead">Tezliklə burada materialların siyahısı olacaq.</p>
      </div>
    </RequireRole>
  );
}
