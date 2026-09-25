import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { GroupsView } from "./GroupsView";

export default function QruplarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN]}>
      <div className="panel-page">
        <h1>Qruplar</h1>
        <p className="panel-page-lead">İstifadəçi qruplarını və onların rollarını idarə edin.</p>
        <GroupsView />
      </div>
    </RequireRole>
  );
}
