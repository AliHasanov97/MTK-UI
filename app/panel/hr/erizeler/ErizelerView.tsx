"use client";

import { useEffect, useState } from "react";
import { Modal } from "../../Modal";
import { DynamicFields } from "../DynamicFields";
import {
  APPLICATION_FIELD_SPECS,
  APPLICATION_TO_ORDER_TYPE,
  APPLICATION_TYPES,
  loadApplications,
  loadOrders,
  nextDocumentNumber,
  saveApplications,
  saveOrders,
  type Application,
  type ApplicationTypeValue,
  type Order,
} from "../mockData";

const STATUS_LABELS: Record<Application["status"], string> = {
  PendingApproval: "Gözləmədə",
  ConvertedToOrder: "Əmrə çevrilib",
};

export function ErizelerView() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this initial read must wait
    // for the client-only effect phase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplications(loadApplications());
  }, []);

  function persist(next: Application[]) {
    setApplications(next);
    saveApplications(next);
  }

  function handleConvert(application: Application) {
    const orderType = APPLICATION_TO_ORDER_TYPE[application.type];
    const orders = loadOrders();
    const newOrder: Order = {
      id: crypto.randomUUID(),
      orderNumber: nextDocumentNumber("ƏMR", orders.length),
      type: orderType as Order["type"],
      employeeName:
        application.type === "JobApplication"
          ? application.fields.candidateName
          : application.employeeName,
      fields: application.fields,
      createdAt: new Date().toISOString().slice(0, 10),
      fromApplicationNumber: application.applicationNumber,
    };
    saveOrders([newOrder, ...orders]);

    if (!applications) return;
    persist(
      applications.map((a) =>
        a.id === application.id ? { ...a, status: "ConvertedToOrder" as const } : a,
      ),
    );
  }

  if (!applications) return <p className="panel-page-lead">Yüklənir…</p>;

  const visible = applications.filter(
    (a) => (!filterType || a.type === filterType) && (!filterStatus || a.status === filterStatus),
  );

  return (
    <div>
      <div className="panel-toolbar">
        <select
          className="panel-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Bütün növlər</option>
          {APPLICATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className="panel-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Bütün statuslar</option>
          <option value="PendingApproval">Gözləmədə</option>
          <option value="ConvertedToOrder">Əmrə çevrilib</option>
        </select>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowCreate(true)}
        >
          + Yeni ərizə
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ərizə №</th>
              <th>Növ</th>
              <th>İşçi</th>
              <th>Tarix</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6}>Nəticə tapılmadı.</td>
              </tr>
            )}
            {visible.map((a) => (
              <tr key={a.id}>
                <td>{a.applicationNumber}</td>
                <td>{APPLICATION_TYPES.find((t) => t.value === a.type)?.label}</td>
                <td>
                  {a.type === "JobApplication" ? a.fields.candidateName : (a.employeeName ?? "—")}
                </td>
                <td>{a.createdAt}</td>
                <td>
                  <span className="panel-role-tag">{STATUS_LABELS[a.status]}</span>
                </td>
                <td>
                  {a.status === "PendingApproval" && (
                    <div className="data-table-actions">
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm"
                        onClick={() => handleConvert(a)}
                      >
                        Əmrə çevir
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateApplicationModal
          onClose={() => setShowCreate(false)}
          onCreate={(application) => {
            persist([application, ...applications]);
            setShowCreate(false);
          }}
          existingCount={applications.length}
        />
      )}
    </div>
  );
}

function CreateApplicationModal({
  onClose,
  onCreate,
  existingCount,
}: {
  onClose: () => void;
  onCreate: (application: Application) => void;
  existingCount: number;
}) {
  const [type, setType] = useState<ApplicationTypeValue>("Vacation");
  const [employeeName, setEmployeeName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const specs = APPLICATION_FIELD_SPECS[type];
  const needsEmployee = type !== "JobApplication";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const application: Application = {
      id: crypto.randomUUID(),
      applicationNumber: nextDocumentNumber("ƏR", existingCount),
      type,
      employeeName: needsEmployee ? employeeName : undefined,
      fields,
      notes: notes || undefined,
      status: "PendingApproval",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onCreate(application);
  }

  return (
    <Modal title="Yeni ərizə" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="app-type">Ərizə növü</label>
          <select
            id="app-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as ApplicationTypeValue);
              setFields({});
            }}
          >
            {APPLICATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {needsEmployee && (
          <div className="form-field">
            <label htmlFor="app-employee">İşçinin adı</label>
            <input
              id="app-employee"
              required
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
            />
          </div>
        )}

        <DynamicFields
          specs={specs}
          values={fields}
          onChange={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
        />

        <div className="form-field">
          <label htmlFor="app-notes">Qeyd</label>
          <input id="app-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary">
            Yarat
          </button>
        </div>
      </form>
    </Modal>
  );
}
