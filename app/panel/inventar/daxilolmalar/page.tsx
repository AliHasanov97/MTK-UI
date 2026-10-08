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
              Anbara daxil olan mallar. Məhsullar Payments bölməsindəki alışlarda alınır və
              orada qəbul edilir — bu səhifə yalnız həmin qəbulların tarixçəsini göstərir.
            </p>
          </div>
          <span className="ledger-badge">Daxilolma</span>
        </div>
        <MovementView transactionType="Receipt" />
      </div>
    </RequireRole>
  );
}
