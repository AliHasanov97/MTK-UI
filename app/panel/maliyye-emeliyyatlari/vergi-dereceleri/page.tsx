import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { VergiDereceleriView } from "./VergiDereceleriView";

export default function VergiDereceleriPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <VergiDereceleriView />
    </RequireRole>
  );
}
