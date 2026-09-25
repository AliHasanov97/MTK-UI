import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { AuditLogView } from "./AuditLogView";

export default function AuditPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN]}>
      <div className="panel-page">
        <h1>Audit qeydləri</h1>
        <p className="panel-page-lead">Sistemdə edilən dəyişikliklərin tarixçəsi.</p>
        <AuditLogView />
      </div>
    </RequireRole>
  );
}
