import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { SalinmalarView } from "./SalinmalarView";

export default function SalinmalarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Salınmalar</h1>
            <p className="panel-page-lead">
              MTK üçün alınan mal və xidmətləri, tədarükçü və qaimə məlumatları ilə birlikdə qeydiyyata alın.
            </p>
          </div>
          <span className="ledger-badge">Təchizat</span>
        </div>
        <SalinmalarView />
      </div>
    </RequireRole>
  );
}
