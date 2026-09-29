import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";

export default function MuqavilelerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Müqavilələr</h1>
        <p className="panel-page-lead">Tezliklə burada müqavilələrin siyahısı olacaq.</p>
      </div>
    </RequireRole>
  );
}
