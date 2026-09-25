import { RequireRole } from "../../components/auth/RequireRole";
import { ROLES } from "../../lib/auth/roles";

export default function HesablarPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.OWNER]}>
      <div className="panel-page">
        <h1>Hesablar və ödənişlər</h1>
        <p className="panel-page-lead">
          Tezliklə burada aylıq hesablar, qismən və avans ödənişlər siyahısı
          olacaq.
        </p>
      </div>
    </RequireRole>
  );
}
