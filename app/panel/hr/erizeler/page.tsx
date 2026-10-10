import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { ErizelerView } from "./ErizelerView";

export default function ErizelerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Ərizələr</h1>
        <p className="panel-page-lead">
          İşçilərin məzuniyyət, icazə, vəzifə dəyişikliyi və digər ərizələri.
        </p>
        <ErizelerView />
      </div>
    </RequireRole>
  );
}
