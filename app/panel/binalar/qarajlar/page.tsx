import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { GaragesView } from "./GaragesView";

export default function QarajlarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Qarajlar</h1>
        <p className="panel-page-lead">Bütün qarajlar və sahiblik məlumatları.</p>
        <GaragesView />
      </div>
    </RequireRole>
  );
}
