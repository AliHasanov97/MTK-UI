import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { BuildingsView } from "./BuildingsView";

export default function BinalarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.STAFF]}>
      <div className="panel-page">
        <h1>Binalar və mənzillər</h1>
        <p className="panel-page-lead">
          Bloklar, mənzillər və sahiblik məlumatları backend-dən canlı gəlir.
        </p>
        <BuildingsView />
      </div>
    </RequireRole>
  );
}
