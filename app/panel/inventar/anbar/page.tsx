import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";

export default function AnbarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.STAFF]}>
      <div className="panel-page">
        <h1>Anbar</h1>
        <p className="panel-page-lead">Tezliklə burada anbar qalıqları olacaq.</p>
      </div>
    </RequireRole>
  );
}
