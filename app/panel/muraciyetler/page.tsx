import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";

export default function MuraciyetlerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Müraciətlər</h1>
        <p className="panel-page-lead">
          Tezliklə burada sakinlərin müraciətləri və gündəlik məsələlər
          olacaq.
        </p>
      </div>
    </RequireRole>
  );
}
