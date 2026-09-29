import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { BinaSiyahisiView } from "./BinaSiyahisiView";

export default function BinaSiyahisiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.STAFF]}>
      <div className="panel-page">
        <h1>Binalar</h1>
        <p className="panel-page-lead">Bütün binalar və yeni bina/mənzil yaratmaq.</p>
        <BinaSiyahisiView />
      </div>
    </RequireRole>
  );
}
