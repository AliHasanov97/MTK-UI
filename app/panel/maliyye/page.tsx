import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";

export default function MaliyyePage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Maliyyə şəffaflığı</h1>
        <p className="panel-page-lead">
          Tezliklə burada ümumi gəlir və xərc hesabatları olacaq.
        </p>
      </div>
    </RequireRole>
  );
}
