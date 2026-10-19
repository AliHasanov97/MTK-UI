import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { AppealDetailView } from "./AppealDetailView";

export default async function AppealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <AppealDetailView appealId={id} />
    </RequireRole>
  );
}
