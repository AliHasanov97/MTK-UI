import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { ProfilView } from "./ProfilView";

export default function ProfilPage() {
  return (
    <RequireRole allowed={[ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Mənim profilim</h1>
        <p className="panel-page-lead">Öz mənzil/qaraj və maliyyə məlumatlarınız.</p>
        <ProfilView />
      </div>
    </RequireRole>
  );
}
