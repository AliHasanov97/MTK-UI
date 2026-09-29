import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roles";
import { OdenislerView } from "./OdenislerView";

export default function OdenislerinDaxilEdilmesiPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
      <OdenislerView />
    </RequireRole>
  );
}
