import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roleConstants";
import { ArticlesAdminView } from "./ArticlesAdminView";

export default function XeberlerPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <ArticlesAdminView />
    </RequireRole>
  );
}
