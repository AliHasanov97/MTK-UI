import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { VendorDetailView } from "./VendorDetailView";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <h1>Tədarükçü</h1>
        <p className="panel-page-lead">Tədarükçünün əlaqə məlumatları, borcları və ödəniş tarixçəsi.</p>
        <VendorDetailView vendorId={id} />
      </div>
    </RequireRole>
  );
}
