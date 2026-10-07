import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { MateriallarView } from "./MateriallarView";

export default function MateriallarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <h1>Materiallar</h1>
            <p className="panel-page-lead">
              Anbarda istifadə olunan mal və xidmətlərin nomenklatura reyestri. Hər materialın
              unikal kodu, kateqoriyası və ölçü vahidi var.
            </p>
          </div>
          <span className="ledger-badge">Nomenklatura</span>
        </div>
        <MateriallarView />
      </div>
    </RequireRole>
  );
}
