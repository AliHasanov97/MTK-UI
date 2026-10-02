import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";

export default function AnbarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Anbar</h1>
        <p className="panel-page-lead">Tezliklə burada anbar qalıqları olacaq.</p>
      </div>
    </RequireRole>
  );
}
