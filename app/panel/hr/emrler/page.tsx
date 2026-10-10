import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { EmrlerView } from "./EmrlerView";

export default function EmrlerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Əmrlər</h1>
        <p className="panel-page-lead">
          İşə qəbul, məzuniyyət, mükafat, cərimə və digər əmrlərin siyahısı.
        </p>
        <EmrlerView />
      </div>
    </RequireRole>
  );
}
