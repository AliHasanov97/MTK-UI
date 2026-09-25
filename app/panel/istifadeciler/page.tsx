import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { UsersView } from "./UsersView";

export default function IstifadecilerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN]}>
      <div className="panel-page">
        <h1>İstifadəçilər</h1>
        <p className="panel-page-lead">
          Sistemdəki istifadəçiləri idarə edin, rol təyin edin.
        </p>
        <UsersView />
      </div>
    </RequireRole>
  );
}
