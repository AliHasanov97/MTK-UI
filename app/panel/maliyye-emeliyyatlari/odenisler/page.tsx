import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { OdenislerView } from "./OdenislerView";

export default function OdenislerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER]}>
      <OdenislerView />
    </RequireRole>
  );
}
