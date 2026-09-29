import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { TariflarView } from "./TariflarView";

export default function TariflarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <TariflarView />
    </RequireRole>
  );
}
