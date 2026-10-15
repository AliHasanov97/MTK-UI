import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { EmekHaqqiView } from "./EmekHaqqiView";

export default function EmekHaqqiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <EmekHaqqiView />
    </RequireRole>
  );
}
