import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { ElaveGelirlerView } from "./ElaveGelirlerView";

export default function ElaveGelirlerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <ElaveGelirlerView />
    </RequireRole>
  );
}
