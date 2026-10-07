import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { AnbarView } from "./AnbarView";

export default function AnbarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Anbar</h1>
            <p className="panel-page-lead">
              Materialların real vaxt qalıqları. Daxilolma qalığı artırır, çıxarış azaldır.
            </p>
          </div>
          <span className="ledger-badge">Anbar</span>
        </div>
        <AnbarView />
      </div>
    </RequireRole>
  );
}
