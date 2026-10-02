import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { HesabatlarView } from "./HesabatlarView";

// ADMIN/ACCOUNTANT only: same scoping as Borclar — the search endpoints aren't
// owner-scoped, so an OWNER role here would see every property's payment history.
export default function HesabatlarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER]}>
      <HesabatlarView />
    </RequireRole>
  );
}
