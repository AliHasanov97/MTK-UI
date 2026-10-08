import Link from "next/link";
import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roleConstants";
import { SalinmaDetailView } from "./SalinmaDetailView";

export default async function SalinmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <Link className="owner-link" href="/panel/maliyye-emeliyyatlari/salinmalar">
              ← Salınmalara qayıt
            </Link>
            <h1>Satınalma detalları</h1>
            <p className="panel-page-lead">Satınalma, tədarükçü və mal sətirləri üzrə məlumat.</p>
          </div>
        </div>
        <SalinmaDetailView purchaseId={id} />
      </div>
    </RequireRole>
  );
}
