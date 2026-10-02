import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { BorclarView } from "./BorclarView";

// ADMIN/ACCOUNTANT only: the backend's search endpoint isn't scoped to the
// caller, so an OWNER role here would see every owner's debts, not just their
// own. Residents already get their own scoped ledger via their owner profile page.
export default function BorclarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <BorclarView />
    </RequireRole>
  );
}
