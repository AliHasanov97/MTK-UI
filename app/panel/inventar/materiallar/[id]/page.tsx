import Link from "next/link";
import { RequireRole } from "../../../../components/auth/RequireRole";
import { ROLES } from "../../../../lib/auth/roleConstants";
import { NomenclatureDetailView } from "./NomenclatureDetailView";

export default async function NomenclatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <div className="panel-page-head">
          <div>
            <Link className="owner-link" href="/panel/inventar/materiallar">
              ← Materiallara qayıt
            </Link>
            <h1>Nomenklatura məlumatı</h1>
            <p className="panel-page-lead">Materialın məlumatları və əvvəlki alış qiymətləri.</p>
          </div>
        </div>
        <NomenclatureDetailView nomenclatureId={id} />
      </div>
    </RequireRole>
  );
}
