import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { MovementView } from "../MovementView";

export default function DaxilolmalarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Daxilolmalar</h1>
            <p className="panel-page-lead">
              Anbara mal qəbulu. Hər daxilolma materialın qalığını artırır və əməliyyat
              tarixçəsində iz qoyur.
            </p>
          </div>
          <span className="ledger-badge">Daxilolma</span>
        </div>
        <MovementView transactionType="Receipt" />
      </div>
    </RequireRole>
  );
}
