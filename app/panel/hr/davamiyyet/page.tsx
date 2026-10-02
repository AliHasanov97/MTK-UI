import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";

export default function DavamiyyetPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.EMPLOYEE]}>
      <div className="panel-page">
        <h1>Davamiyyət</h1>
        <p className="panel-page-lead">
          Tezliklə burada aylıq davamiyyət cədvəli olacaq.
        </p>
      </div>
    </RequireRole>
  );
}
