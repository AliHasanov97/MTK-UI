import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { MuqavilelerView } from "./MuqavilelerView";

export default function MuqavilelerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Müqavilələr</h1>
        <p className="panel-page-lead">
          Tədarükçülərlə bağlanan xidmət müqavilələri. Müqavilə üzrə xidmətlər (məs. liftə aylıq texniki
          xidmət) aktivləşdirildikdən sonra hər ay borc yaradır.
        </p>
        <MuqavilelerView />
      </div>
    </RequireRole>
  );
}
