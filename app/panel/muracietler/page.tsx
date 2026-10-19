import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { AppealsView } from "./AppealsView";

export default function MuracietlerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <AppealsView />
    </RequireRole>
  );
}
