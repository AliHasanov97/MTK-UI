import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";

export default function XerclerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Xərclərin daxil edilməsi</h1>
        <p className="panel-page-lead">Tezliklə burada xərc daxiletmə forması olacaq.</p>
      </div>
    </RequireRole>
  );
}
