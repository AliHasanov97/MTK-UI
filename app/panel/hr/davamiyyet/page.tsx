import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { DavamiyyetView } from "./DavamiyyetView";

export default function DavamiyyetPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Tabel</h1>
        <p className="panel-page-lead">İşçilərin aylıq iş vaxtının uçotu tabeli.</p>
        <DavamiyyetView />
      </div>
    </RequireRole>
  );
}
