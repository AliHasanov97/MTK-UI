"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  addUserToGroup,
  assignRolesToGroup,
  createGroup,
  deleteGroup,
  getGroupRoles,
  getGroupUsers,
  listAvailableRoleNames,
  listGroups,
  listUsers,
  removeRolesFromGroup,
  removeUserFromGroup,
  type Group,
  type GroupMember,
  type GroupRole,
  type UserSummary,
} from "../../lib/api/identity";
import { Modal } from "../Modal";
import { SearchableSelect } from "../SearchableSelect";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function GroupsView() {
  const auth = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  function load() {
    if (auth.status !== "authenticated") return;
    listGroups(auth.accessToken)
      .then((res) => {
        setGroups(res);
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
    if (!deletingGroup) return;
    try {
      await deleteGroup(accessToken, deletingGroup.id);
      setDeletingGroup(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
      setDeletingGroup(null);
    }
  }

  return (
    <div>
      <div className="panel-toolbar">
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
          + Yeni qrup
        </button>
      </div>

      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {!groups ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Təsvir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3}>Qrup tapılmadı.</td>
                </tr>
              )}
              {groups.map((group) => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{group.description ?? "—"}</td>
                  <td>
                    <div className="data-table-actions">
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm"
                        onClick={() => setDetailGroup(group)}
                      >
                        Ətraflı
                      </button>
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm panel-btn-danger"
                        onClick={() => setDeletingGroup(group)}
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
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {detailGroup && <GroupDetailModal group={detailGroup} onClose={() => setDetailGroup(null)} />}

      {deletingGroup && (
        <Modal title="Qrupu sil" onClose={() => setDeletingGroup(null)}>
          <p className="panel-page-lead">
            <strong>{deletingGroup.name}</strong> qrupunu silmək istədiyinizə əminsiniz?
          </p>
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={() => setDeletingGroup(null)}>
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

function CreateGroupModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
      await createGroup(accessToken, { name, description: description || null, parentGroupId: null });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni qrup" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-field">
          <label htmlFor="group-name">Ad</label>
          <input id="group-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="group-description">Təsvir</label>
          <input
            id="group-description"
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

function GroupDetailModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const auth = useAuth();
  const [roles, setRoles] = useState<GroupRole[] | null>(null);
  const [availableRoleNames, setAvailableRoleNames] = useState<string[]>([]);
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [addRoleName, setAddRoleName] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadDetail() {
    if (auth.status !== "authenticated") return;
    const token = auth.accessToken;
    Promise.allSettled([
      getGroupRoles(token, group.id),
      getGroupUsers(token, group.id),
      listAvailableRoleNames(token),
      listUsers(token),
    ]).then(([groupRoles, groupUsers, roleNames, users]) => {
      if (groupRoles.status === "fulfilled") setRoles(groupRoles.value);
      if (groupUsers.status === "fulfilled") setMembers(groupUsers.value);
      if (roleNames.status === "fulfilled") setAvailableRoleNames(roleNames.value);
      if (users.status === "fulfilled") setAllUsers(users.value);

      const failed = [groupRoles, groupUsers, roleNames, users].find(
        (r) => r.status === "rejected",
      );
      if (failed && failed.status === "rejected") {
        setError(errorMessage(failed.reason));
      }
    });
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleAddRole() {
    if (!addRoleName) return;
    try {
      await assignRolesToGroup(accessToken, group.id, [addRoleName]);
      setAddRoleName("");
      loadDetail();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleRemoveRole(name: string) {
    try {
      await removeRolesFromGroup(accessToken, group.id, [name]);
      loadDetail();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleAddUser() {
    if (!addUserId) return;
    try {
      await addUserToGroup(accessToken, group.id, addUserId);
      setAddUserId("");
      loadDetail();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleRemoveUser(userId: string) {
    try {
      await removeUserFromGroup(accessToken, group.id, userId);
      loadDetail();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const assignableRoleNames = availableRoleNames.filter(
    (name) => !roles?.some((r) => r.name === name),
  );
  const addableUsers = allUsers.filter((u) => !members?.some((m) => m.id === u.id));

  return (
    <Modal title={group.name} wide onClose={onClose}>
      {error && <p className="form-error">{error}</p>}

      <div className="detail-section">
        <h3>Rollar</h3>
        {!roles ? (
          <p className="panel-page-lead">Yüklənir…</p>
        ) : (
          <div className="checkbox-list" style={{ marginBottom: 10 }}>
            {roles.length === 0 && <span>Rol təyin edilməyib.</span>}
            {roles.map((role) => (
              <div key={role.name} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{role.name}</span>
                <button
                  type="button"
                  className="panel-btn panel-btn-sm panel-btn-danger"
                  onClick={() => handleRemoveRole(role.name)}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={addRoleName}
            onChange={(e) => setAddRoleName(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Rol seçin…</option>
            {assignableRoleNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button type="button" className="panel-btn panel-btn-sm" onClick={handleAddRole}>
            Əlavə et
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3>Üzvlər</h3>
        {!members ? (
          <p className="panel-page-lead">Yüklənir…</p>
        ) : (
          <div className="checkbox-list" style={{ marginBottom: 10 }}>
            {members.length === 0 && <span>Üzv yoxdur.</span>}
            {members.map((member) => (
              <div key={member.id} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {member.firstName ?? ""} {member.lastName ?? ""} ({member.email})
                </span>
                <button
                  type="button"
                  className="panel-btn panel-btn-sm panel-btn-danger"
                  onClick={() => handleRemoveUser(member.id)}
                >
                  Çıxar
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <SearchableSelect
            placeholder="İstifadəçi seçin…"
            value={addUserId}
            onChange={setAddUserId}
            options={addableUsers.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              sublabel: u.email,
            }))}
          />
          <button type="button" className="panel-btn panel-btn-sm" onClick={handleAddUser}>
            Əlavə et
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="panel-btn" onClick={onClose}>
          Bağla
        </button>
      </div>
    </Modal>
  );
}
