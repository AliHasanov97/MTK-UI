import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { ElaveGelirlerView } from "./ElaveGelirlerView";

export default function ElaveGelirlerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <ElaveGelirlerView />
    </RequireRole>
  );
}
