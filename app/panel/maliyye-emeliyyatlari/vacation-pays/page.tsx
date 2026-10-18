import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { VacationPaysView } from "./VacationPaysView";

export default function VacationPaysPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Məzuniyyət ödənişləri</h1>
        <p className="panel-page-lead">
          Bütün işçilər üzrə məzuniyyət haqqı ödənişlərinin siyahısı və idarəetməsi.
        </p>
        <VacationPaysView />
      </div>
    </RequireRole>
  );
}
