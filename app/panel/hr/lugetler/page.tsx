import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { LugetlerView } from "./LugetlerView";

export default function LugetlerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Lüğətlər</h1>
        <p className="panel-page-lead">İşçi kartı və ərizələrdə istifadə olunan vəzifələr və təhsil ocaqları.</p>
        <LugetlerView />
      </div>
    </RequireRole>
  );
}
