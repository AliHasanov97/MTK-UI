import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roleConstants";
import { GarageDetailView } from "./GarageDetailView";

export default async function GarageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Qaraj</h1>
        <p className="panel-page-lead">Qarajın təfərrüatları və mülkiyyət məlumatı.</p>
        <GarageDetailView garageId={id} />
      </div>
    </RequireRole>
  );
}
