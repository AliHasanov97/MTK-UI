import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { TedarukculerView } from "./TedarukculerView";

// Tədarükçülər və onların borcları bir səhifədə: iki seqmentli görünüş.
export default function TedarukculerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Tədarükçülər</h1>
            <p className="panel-page-lead">
              Müqavilə bağladığımız mal və xidmət tədarükçüləri və onların qarşısında borcumuz.
              Müqavilə üzrə xidmət borcları avtomatik yaradılır, mal borcları isə qaimə ilə.
            </p>
          </div>
          <span className="ledger-badge">Təchizat</span>
        </div>
        <TedarukculerView />
      </div>
    </RequireRole>
  );
}
