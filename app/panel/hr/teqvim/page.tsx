import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { TeqvimView } from "./TeqvimView";

export default function TeqvimPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>İstehsalat təqvimi</h1>
        <p className="panel-page-lead">Bayram və qeyri-iş günləri. Tabel və məzuniyyət müddəti bu təqvimə əsasən hesablanır.</p>
        <TeqvimView />
      </div>
    </RequireRole>
  );
}
