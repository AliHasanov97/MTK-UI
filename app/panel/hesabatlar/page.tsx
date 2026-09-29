import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";

export default function HesabatlarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Hesabatlar</h1>
        <p className="panel-page-lead">Tezliklə burada hesabatlar olacaq.</p>
      </div>
    </RequireRole>
  );
}
