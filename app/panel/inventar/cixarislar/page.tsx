import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { MovementView } from "../MovementView";

export default function CixarislarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Çıxarışlar</h1>
            <p className="panel-page-lead">
              Anbardan mal çıxarışı. Kifayət qədər qalıq yoxdursa, çıxarış qeydə alınmır.
            </p>
          </div>
          <span className="ledger-badge">Çıxarış</span>
        </div>
        <MovementView transactionType="Issue" />
      </div>
    </RequireRole>
  );
}
