import { RequireRole } from "../../../components/auth/RequireRole";
import { ROLES } from "../../../lib/auth/roleConstants";
import { PayrollHistoryView } from "./PayrollHistoryView";

export default function PayrollHistoryPage() {
  return (
    <RequireRole allowed={[ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.BUILDING_MANAGER]}>
      <div className="panel-page">
        <h1>Əmək haqqı tarixçəsi</h1>
        <p className="panel-page-lead">
          Bütün aylar üzrə əmək haqqı hesablamaları və ödənişləri.
        </p>
        <PayrollHistoryView />
      </div>
    </RequireRole>
  );
}
