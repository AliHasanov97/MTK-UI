"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/client";
import {
  assignRolesToUser,
  deleteUser,
  getUserRoles,
  listRoles,
  registerUser,
  removeRolesFromUser,
  searchUsers,
  updateUser,
  type Role,
  type SearchUsersResult,
  type UserSummary,
} from "../../lib/api/identity";
import { Modal } from "../Modal";

const PAGE_SIZE = 10;

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu əməliyyat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

export function UsersView() {
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [result, setResult] = useState<SearchUsersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [rolesUser, setRolesUser] = useState<UserSummary | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    searchUsers(auth.accessToken, {
      searchTerm: searchTerm || undefined,
      pageNumber,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setResult(res);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, pageNumber]);

  useEffect(() => {
    load();
  }, [load]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleDelete() {
    if (!deletingUser) return;
    try {
      await deleteUser(accessToken, deletingUser.id);
      setDeletingUser(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
      setDeletingUser(null);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (ad, email, telefon)…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPageNumber(1);
          }}
        />
        <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
          + Yeni istifadəçi
        </button>
      </div>

      {error && (
        <div className="panel-denied" style={{ marginBottom: 16 }}>
          <h2>Xəta</h2>
          <p>{error}</p>
        </div>
      )}

      {!result ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.users.length === 0 && (
                <tr>
                  <td colSpan={5}>Nəticə tapılmadı.</td>
                </tr>
              )}
              {result.users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber ?? "—"}</td>
                  <td>
                    <span className="panel-role-tag">{user.status}</span>
                  </td>
                  <td>
                    <div className="data-table-actions">
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm"
                        onClick={() => setRolesUser(user)}
                      >
                        Rollar
                      </button>
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm"
                        onClick={() => setEditingUser(user)}
                      >
                        Redaktə
                      </button>
                      <button
                        type="button"
                        className="panel-btn panel-btn-sm panel-btn-danger"
                        onClick={() => setDeletingUser(user)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel-pagination">
            <span>
              Cəmi {result.totalCount} istifadəçi — səhifə {result.pageNumber}/{totalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                Əvvəlki
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-sm"
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editingUser && (
        <UserFormModal
          mode="edit"
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            load();
          }}
        />
      )}

      {rolesUser && <UserRolesModal user={rolesUser} onClose={() => setRolesUser(null)} />}

      {deletingUser && (
        <Modal title="İstifadəçini sil" onClose={() => setDeletingUser(null)}>
          <p className="panel-page-lead">
            <strong>
              {deletingUser.firstName} {deletingUser.lastName}
            </strong>{" "}
            istifadəçisini silmək istədiyinizə əminsiniz?
          </p>
          <div className="form-actions">
            <button type="button" className="panel-btn" onClick={() => setDeletingUser(null)}>
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

function UserFormModal({
  mode,
  user,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  user?: UserSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [email, setEmail] = useState(mode === "edit" && user ? user.email : "");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        await registerUser(accessToken, {
          email,
          firstName,
          lastName,
          password,
          phoneNumber: phoneNumber || null,
        });
      } else if (user) {
        await updateUser(accessToken, user.id, {
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={mode === "create" ? "Yeni istifadəçi" : "İstifadəçini redaktə et"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        {mode === "create" && (
          <div className="form-field">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="user-firstname">Ad</label>
            <input
              id="user-firstname"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="user-lastname">Soyad</label>
            <input
              id="user-lastname"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="user-phone">Telefon</label>
          <input
            id="user-phone"
            value={phoneNumber ?? ""}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        {mode === "create" && (
          <div className="form-field">
            <label htmlFor="user-password">Şifrə</label>
            <input
              id="user-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
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

function UserRolesModal({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const auth = useAuth();
  const [allRoles, setAllRoles] = useState<Role[] | null>(null);
  const [originalRoleNames, setOriginalRoleNames] = useState<string[]>([]);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    Promise.all([listRoles(auth.accessToken), getUserRoles(auth.accessToken, user.id)])
      .then(([roles, userRoles]) => {
        setAllRoles(roles);
        const names = userRoles.directRoles.map((r) => r.name);
        setOriginalRoleNames(names);
        setSelectedRoleNames(names);
      })
      .catch((err) => setError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  function toggleRole(name: string) {
    setSelectedRoleNames((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name],
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const toAdd = selectedRoleNames.filter((r) => !originalRoleNames.includes(r));
    const toRemove = originalRoleNames.filter((r) => !selectedRoleNames.includes(r));
    try {
      if (toAdd.length > 0) await assignRolesToUser(accessToken, user.id, toAdd);
      if (toRemove.length > 0) await removeRolesFromUser(accessToken, user.id, toRemove);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${user.firstName} ${user.lastName} — rollar`} onClose={onClose}>
      {error && <p className="form-error">{error}</p>}
      {!allRoles ? (
        <p className="panel-page-lead">Yüklənir…</p>
      ) : (
        <div className="checkbox-list">
          {allRoles.map((role) => (
            <label key={role.name}>
              <input
                type="checkbox"
                checked={selectedRoleNames.includes(role.name)}
                onChange={() => toggleRole(role.name)}
              />
              {role.name}
            </label>
          ))}
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="panel-btn" onClick={onClose}>
          Ləğv et
        </button>
        <button type="button" className="panel-btn panel-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saxlanılır…" : "Saxla"}
        </button>
      </div>
    </Modal>
  );
}
