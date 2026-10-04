import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { MuqavileDetailView } from "./MuqavileDetailView";

export default async function MuqavileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Müqavilə</h1>
        <p className="panel-page-lead">Müqavilənin şərtləri, xidmətləri və statusu.</p>
        <MuqavileDetailView contractId={id} />
      </div>
    </RequireRole>
  );
}
