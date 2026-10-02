import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roleConstants";
import { ApartmentDetailView } from "./ApartmentDetailView";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Mənzil</h1>
        <p className="panel-page-lead">Mənzilin təfərrüatları və mülkiyyət məlumatı.</p>
        <ApartmentDetailView apartmentId={id} />
      </div>
    </RequireRole>
  );
}
