import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";
import { TranzaksiyalarView } from "./TranzaksiyalarView";

export default function TranzaksiyalarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <TranzaksiyalarView />
    </RequireRole>
  );
}
