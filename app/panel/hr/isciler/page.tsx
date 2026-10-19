import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { IscilerView } from "./IscilerView";

export default function IscilerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>İşçilər</h1>
        <p className="panel-page-lead">İşçilərin siyahısı, vəzifə və maaş məlumatları.</p>
        <IscilerView />
      </div>
    </RequireRole>
  );
}
