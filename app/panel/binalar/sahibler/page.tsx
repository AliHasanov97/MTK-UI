import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { OwnersView } from "./OwnersView";

export default function SahiblerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.STAFF]}>
      <div className="panel-page">
        <h1>Sahiblər</h1>
        <p className="panel-page-lead">Bütün mənzil sahibləri və əlaqə məlumatları.</p>
        <OwnersView />
      </div>
    </RequireRole>
  );
}
