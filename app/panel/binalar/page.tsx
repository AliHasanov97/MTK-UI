import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { BuildingsView } from "./BuildingsView";

export default function BinalarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Mənzillər</h1>
        <p className="panel-page-lead">
          Bütün mənzillər və sahiblik məlumatları — bina üzrə filtrləyə bilərsiniz.
        </p>
        <BuildingsView />
      </div>
    </RequireRole>
  );
}
