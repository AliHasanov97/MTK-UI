import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";

export default function ElaveGelirlerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Əlavə gəlirlərin daxil edilməsi</h1>
        <p className="panel-page-lead">
          Tezliklə burada əlavə gəlir daxiletmə forması olacaq.
        </p>
      </div>
    </RequireRole>
  );
}
