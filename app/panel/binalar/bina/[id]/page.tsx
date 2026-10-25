import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roleConstants";
import { BuildingDetailView } from "./BuildingDetailView";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Bina</h1>
        <p className="panel-page-lead">Binanın təfərrüatları, mənzilləri və maliyyə vəziyyəti.</p>
        <BuildingDetailView buildingId={id} />
      </div>
    </RequireRole>
  );
}
