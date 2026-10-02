import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { XerclerView } from "./XerclerView";

export default function XerclerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <XerclerView />
    </RequireRole>
  );
}
