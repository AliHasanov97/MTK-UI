"use client";

import { useEffect, useState } from "react";
import { QueryComparisonType } from "../../../../lib/api/buildings";
import {
  APPLICATION_KINDS,
  ORDER_FOR_APPLICATION,
  ORDER_KINDS,
  applicationKindFromValue,
  orderKindFromValue,
  searchApplications,
  searchOrders,
  type ApplicationItem,
  type OrderItem,
} from "../../../../lib/api/hr";
import { formatDateTime } from "../../../../lib/format";
import { CreateApplicationModal, CreateOrderModal } from "../../CreateDocumentModals";
import { DocumentDetailModal, type DocTarget } from "../../DocumentDetailModal";
import { hrErrorMessage } from "../../shared";

/** İşçiyə aid ərizə və əmrlər; sətrə klikləyəndə detal pəncərəsi (PDF, imzalı sənəd və s.) açılır. */
export function EmployeeDocumentsTab({ accessToken, employeeId }: { accessToken: string; employeeId: string }) {
  const [applications, setApplications] = useState<ApplicationItem[] | null>(null);
  const [orders, setOrders] = useState<OrderItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState<DocTarget | null>(null);
  const [creating, setCreating] = useState<"application" | "order" | null>(null);

  useEffect(() => {
    // Backend ümumi Filters ilə işləyir: "EmployeeId" şərti bütün ərizə/əmr növlərindən işçinin sənədlərini seçir
    const params = {
      filters: [{ columnName: "EmployeeId", comparison: QueryComparisonType.Equals, value: employeeId }],
      sortCriteria: { columnName: "CreatedAt", direction: 1 as const },
      page: 0,
      pageSize: 100,
    };
    Promise.all([searchApplications(accessToken, params), searchOrders(accessToken, params)])
      .then(([apps, ords]) => {
        setApplications(apps.data);
        setOrders(ords.data);
        setError(null);
      })
      .catch((err) => setError(hrErrorMessage(err)));
  }, [accessToken, employeeId, reloadKey]);

  return (
    <div className="hr-docs">
      {error && <p className="form-error">{error}</p>}
      {!applications || !orders ? (
        !error && <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <>
          <section className="hr-section">
            <h3 className="hr-section-title">
              Ərizələr
              <button type="button" className="panel-btn panel-btn-sm panel-btn-primary hr-section-edit" onClick={() => setCreating("application")}>
                + Yeni ərizə
              </button>
            </h3>
            {applications.length === 0 ? (
              <div className="hr-empty">
                <strong>Ərizə yoxdur</strong>
                <span>Bu işçiyə aid ərizə hələ yaradılmayıb.</span>
              </div>
            ) : (
              <div className="em-table-scroll">
                <table className="em-table">
                  <thead>
                    <tr>
                      <th className="em-col-no">№</th>
                      <th>Növ</th>
                      <th>Tarix</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a) => {
                      const kind = applicationKindFromValue(a.type);
                      const pending = a.status === "PendingApproval";
                      return (
                        <tr
                          key={a.id}
                          className="doc-row"
                          onClick={() => kind && setDetail({ type: "application", kind, id: a.id })}
                        >
                          <td className="em-col-no" data-label="№">{a.applicationNumber}</td>
                          <td data-label="Növ">{kind ? APPLICATION_KINDS[kind].label : a.type}</td>
                          <td data-label="Tarix">{formatDateTime(a.createdAt)}</td>
                          <td data-label="Status">
                            {pending || !kind || !a.order ? (
                              <span className="panel-role-tag panel-role-tag-warn">Gözləmədə</span>
                            ) : (
                              <button
                                type="button"
                                className="panel-role-tag panel-role-tag-good doc-status-link"
                                title="Əlaqəli əmri aç"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetail({ type: "order", kind: ORDER_FOR_APPLICATION[kind], id: a.order!.id });
                                }}
                              >
                                Əmrə çevrilib · №{a.order.name} →
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="hr-section">
            <h3 className="hr-section-title">
              Əmrlər
              <button type="button" className="panel-btn panel-btn-sm panel-btn-primary hr-section-edit" onClick={() => setCreating("order")}>
                + Yeni əmr
              </button>
            </h3>
            {orders.length === 0 ? (
              <div className="hr-empty">
                <strong>Əmr yoxdur</strong>
                <span>Bu işçiyə aid əmr hələ yaradılmayıb.</span>
              </div>
            ) : (
              <div className="em-table-scroll">
                <table className="em-table">
                  <thead>
                    <tr>
                      <th className="em-col-no">№</th>
                      <th>Növ</th>
                      <th>Tarix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const kind = orderKindFromValue(o.type);
                      return (
                        <tr key={o.id} className="doc-row" onClick={() => kind && setDetail({ type: "order", kind, id: o.id })}>
                          <td className="em-col-no" data-label="№">{o.orderNumber}</td>
                          <td data-label="Növ">{kind ? ORDER_KINDS[kind].label : o.type}</td>
                          <td data-label="Tarix">{formatDateTime(o.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {creating === "application" && (
        <CreateApplicationModal
          accessToken={accessToken}
          employeeId={employeeId}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {creating === "order" && (
        <CreateOrderModal
          accessToken={accessToken}
          employeeId={employeeId}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {detail && (
        <DocumentDetailModal
          accessToken={accessToken}
          target={detail}
          onClose={() => setDetail(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
