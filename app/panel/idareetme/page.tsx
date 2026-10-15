import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { CompanyProfileView } from "./CompanyProfileView";

export default function IdareetmePage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN]}>
      <div className="panel-page">
        <h1>Sistem idarəetməsi</h1>
        <p className="panel-page-lead">Tezliklə burada əlavə sistem parametrləri olacaq.</p>
        <CompanyProfileView />
      </div>
    </RequireRole>
  );
}
