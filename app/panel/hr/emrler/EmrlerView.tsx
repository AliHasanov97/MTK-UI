"use client";

import { useEffect, useState } from "react";
import { Modal } from "../../Modal";
import { DynamicFields } from "../DynamicFields";
import {
  DIRECT_ORDER_TYPES,
  ORDER_FIELD_SPECS,
  ORDER_TYPE_LABELS,
  loadOrders,
  nextDocumentNumber,
  saveOrders,
  type Order,
  type OrderTypeValue,
} from "../mockData";

export function EmrlerView() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filterType, setFilterType] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this initial read must wait
    // for the client-only effect phase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrders(loadOrders());
  }, []);

  function persist(next: Order[]) {
    setOrders(next);
    saveOrders(next);
  }

  if (!orders) return <p className="panel-page-lead">Yüklənir…</p>;

  const visible = orders.filter((o) => !filterType || o.type === filterType);

  return (
    <div>
      <div className="panel-toolbar">
        <select
          className="panel-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Bütün növlər</option>
          {(Object.keys(ORDER_TYPE_LABELS) as OrderTypeValue[]).map((type) => (
            <option key={type} value={type}>
              {ORDER_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="panel-btn panel-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowCreate(true)}
        >
          + Yeni əmr
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Əmr №</th>
              <th>Növ</th>
              <th>İşçi</th>
              <th>Tarix</th>
              <th>Mənbə</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5}>Nəticə tapılmadı.</td>
              </tr>
            )}
            {visible.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{ORDER_TYPE_LABELS[o.type]}</td>
                <td>{o.employeeName ?? "—"}</td>
                <td>{o.createdAt}</td>
                <td>
                  {o.fromApplicationNumber ? (
                    <span className="panel-role-tag">{o.fromApplicationNumber}</span>
                  ) : (
                    <span className="panel-role-tag">Birbaşa əmr</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreate={(order) => {
            persist([order, ...orders]);
            setShowCreate(false);
          }}
          existingCount={orders.length}
        />
      )}
    </div>
  );
}

function CreateOrderModal({
  onClose,
  onCreate,
  existingCount,
}: {
  onClose: () => void;
  onCreate: (order: Order) => void;
  existingCount: number;
}) {
  const [type, setType] = useState<OrderTypeValue>(DIRECT_ORDER_TYPES[0].value);
  const [employeeName, setEmployeeName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const specs = ORDER_FIELD_SPECS[type] ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: nextDocumentNumber("ƏMR", existingCount),
      type,
      employeeName,
      fields,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onCreate(order);
  }

  return (
    <Modal title="Yeni əmr" onClose={onClose}>
      <p className="panel-page-lead">
        Yalnız birbaşa verilə bilən əmr növləri göstərilir — digərləri (Məzuniyyət,
        Vəzifə dəyişikliyi və s.) müvafiq ərizənin təsdiqi ilə avtomatik yaranır.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="order-type">Əmr növü</label>
          <select
            id="order-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as OrderTypeValue);
              setFields({});
            }}
          >
            {DIRECT_ORDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="order-employee">İşçinin adı</label>
          <input
            id="order-employee"
            required
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
          />
        </div>

        <DynamicFields
          specs={specs}
          values={fields}
          onChange={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
        />

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
