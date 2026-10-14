import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { CustomerDetailView } from "./CustomerDetailView";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Müştəri</h1>
        <p className="panel-page-lead">Müştərinin əlaqə məlumatları, müqavilələri, borcları və ödəniş tarixçəsi.</p>
        <CustomerDetailView customerId={id} />
      </div>
    </RequireRole>
  );
}
