import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { RolesView } from "./RolesView";

export default function RollarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN]}>
      <div className="panel-page">
        <h1>Rollar</h1>
        <p className="panel-page-lead">Sistem rollarını idarə edin.</p>
        <RolesView />
      </div>
    </RequireRole>
  );
}
