import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";

export default function MuraciyetlerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.STAFF, ROLES.OWNER]}>
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
