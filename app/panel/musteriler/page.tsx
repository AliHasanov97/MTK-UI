import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { MusterilerView } from "./MusterilerView";

export default function MusterilerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Müştərilər</h1>
            <p className="panel-page-lead">
              Bizə ödəniş edən kənar tərəflər. Tədarükçülərdən fərqli olaraq, müştərilər bizə borclu olur.
            </p>
          </div>
          <span className="ledger-badge">Gəlir</span>
        </div>
        <MusterilerView />
      </div>
    </RequireRole>
  );
}
