import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";

export default function IscilerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.EMPLOYEE]}>
      <div className="panel-page">
        <h1>İşçilər</h1>
        <p className="panel-page-lead">Tezliklə burada işçilərin siyahısı olacaq.</p>
      </div>
    </RequireRole>
  );
}
