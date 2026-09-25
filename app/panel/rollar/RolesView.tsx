"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import { createRole, deleteRole, listRoles, type Role } from "../../lib/api/identity";
import { Modal } from "../Modal";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function RolesView() {
  const auth = useAuth();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  function load() {
    if (auth.status !== "authenticated") return;
    listRoles(auth.accessToken)
      .then((res) => {
        setRoles(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleDelete() {
    if (!deletingRole) return;
    try {
      await deleteRole(accessToken, deletingRole.name);
      setDeletingRole(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
      setDeletingRole(null);
    }
  }

  const visibleRoles = roles?.filter((r) =>
    r.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Rol axtar…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
          + Yeni rol
        </button>
      </div>

      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {!visibleRoles ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Təsvir</th>
                <th>Növ</th>
                <th>Aktiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleRoles.length === 0 && (
                <tr>
                  <td colSpan={5}>Rol tapılmadı.</td>
                </tr>
              )}
              {visibleRoles.map((role) => (
                <tr key={role.name}>
                  <td>{role.name}</td>
                  <td>{role.description ?? "—"}</td>
                  <td>{role.roleType}</td>
                  <td>
                    <span className="panel-role-tag">{role.isActive ? "Aktiv" : "Deaktiv"}</span>
                  </td>
                  <td>
                    <div className="data-table-actions">
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm panel-btn-danger"
                        onClick={() => setDeletingRole(role)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {deletingRole && (
        <Modal title="Rolu sil" onClose={() => setDeletingRole(null)}>
          <p className="panel-page-lead">
            <strong>{deletingRole.name}</strong> rolunu silmək istədiyinizə əminsiniz?
          </p>
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={() => setDeletingRole(null)}>
              Ləğv et
            </button>
            <button type="button" className="panel-btn panel-btn-danger" onClick={handleDelete}>
              Sil
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateRoleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createRole(accessToken, { name, description: description || null });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni rol" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="role-name">Ad</label>
          <input id="role-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="role-description">Təsvir</label>
          <input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Saxla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
