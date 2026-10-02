import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roles";
import { OwnerDetailView } from "./OwnerDetailView";

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Sahib</h1>
        <p className="panel-page-lead">Mənzil sahibinin əlaqə məlumatları və mülkiyyət xülasəsi.</p>
        <OwnerDetailView ownerId={id} />
      </div>
    </RequireRole>
  );
}
