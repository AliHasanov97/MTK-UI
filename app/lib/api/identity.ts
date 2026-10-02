import { apiFetch } from "./client";

// ---------- Users ----------

export type UserSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  status: string;
};

export type UserDetail = UserSummary & {
  identityId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type RoleRef = {
  id: string;
  name: string;
  description?: string | null;
  roleType: string;
};

export type GroupRef = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
};

export type UserRoles = {
  userId: string;
  directRoles: RoleRef[];
  inheritedRoles?: RoleRef[] | null;
};

export type UserGroups = {
  userId: string;
  groups: GroupRef[];
};

export type UserRolesAndGroups = {
  userId: string;
  directRoles: RoleRef[];
  inheritedRoles: RoleRef[];
  groups: GroupRef[];
};

export type SearchUsersRequest = {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type SearchUsersResult = {
  users: UserSummary[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type RegisterUserRequest = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string | null;
  roleNames?: string[];
};

export type UpdateUserRequest = {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
};

export function listUsers(token: string) {
  return apiFetch<UserSummary[]>("api/identity/users", token);
}

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  role: string;
};

/** "Mənim profilim" və bənzər özünə-aid səhifələr üçün — cari istifadəçinin öz Users.Id-si. */
export function getCurrentUser(token: string) {
  return apiFetch<CurrentUser>("api/identity/users/me", token);
}

export function searchUsers(token: string, request: SearchUsersRequest) {
  return apiFetch<SearchUsersResult>("api/identity/users/search", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getUser(token: string, id: string) {
  return apiFetch<UserDetail>(`api/identity/users/${id}`, token);
}

export function registerUser(token: string, request: RegisterUserRequest) {
  return apiFetch<{ userId: string }>("api/identity/users/register", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateUser(token: string, id: string, request: UpdateUserRequest) {
  return apiFetch<void>(`api/identity/users/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export function deleteUser(token: string, id: string) {
  return apiFetch<void>(`api/identity/users/${id}`, token, { method: "DELETE" });
}

export function getUserRoles(token: string, userId: string, includeInheritedRoles = false) {
  return apiFetch<UserRoles>(
    `api/identity/users/${userId}/roles?includeInheritedRoles=${includeInheritedRoles}`,
    token,
  );
}

export function assignRolesToUser(token: string, userId: string, roleNames: string[]) {
  return apiFetch<void>(`api/identity/users/${userId}/roles`, token, {
    method: "POST",
    body: JSON.stringify({ roleNames }),
  });
}

export function removeRolesFromUser(token: string, userId: string, roleNames: string[]) {
  return apiFetch<void>(`api/identity/users/${userId}/roles`, token, {
    method: "DELETE",
    body: JSON.stringify({ roleNames }),
  });
}

export function getUserGroups(token: string, userId: string) {
  return apiFetch<UserGroups>(`api/identity/users/${userId}/groups`, token);
}

export function getUserRolesAndGroups(token: string, userId: string) {
  return apiFetch<UserRolesAndGroups>(`api/identity/users/${userId}/roles-and-groups`, token);
}

// ---------- Roles ----------

export type Role = {
  id: string;
  name: string;
  description?: string | null;
  roleType: string;
  isActive: boolean;
};

export type SearchRolesRequest = {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type SearchRolesResult = {
  roles: Role[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type CreateRoleRequest = { name: string; description?: string | null };
export type UpdateRoleRequest = { name: string; description?: string | null };

export function listRoles(token: string) {
  return apiFetch<Role[]>("api/identity/roles", token);
}

export function searchRoles(token: string, request: SearchRolesRequest) {
  return apiFetch<SearchRolesResult>("api/identity/roles/search", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function createRole(token: string, request: CreateRoleRequest) {
  return apiFetch<{ roleId: string }>("api/identity/roles", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateRole(token: string, oldRoleName: string, request: UpdateRoleRequest) {
  return apiFetch<void>(`api/identity/roles/${encodeURIComponent(oldRoleName)}`, token, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export function deleteRole(token: string, roleName: string) {
  return apiFetch<void>(`api/identity/roles/${encodeURIComponent(roleName)}`, token, {
    method: "DELETE",
  });
}

// ---------- Groups ----------

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
};

export type SearchGroupsRequest = {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type SearchGroupsResult = {
  groups: Group[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type CreateGroupRequest = {
  name: string;
  description?: string | null;
  parentGroupId?: string | null;
};

export type UpdateGroupRequest = {
  name: string;
  description?: string | null;
  parentGroupId?: string | null;
};

export type GroupMember = {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type GroupRole = {
  id: string;
  name: string;
  description?: string | null;
  roleType: string;
};

export function listGroups(token: string) {
  return apiFetch<Group[]>("api/identity/groups", token);
}

export function searchGroups(token: string, request: SearchGroupsRequest) {
  return apiFetch<SearchGroupsResult>("api/identity/groups/search", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getGroup(token: string, id: string) {
  return apiFetch<Group>(`api/identity/groups/${id}`, token);
}

export function createGroup(token: string, request: CreateGroupRequest) {
  return apiFetch<{ groupId: string }>("api/identity/groups", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateGroup(token: string, id: string, request: UpdateGroupRequest) {
  return apiFetch<void>(`api/identity/groups/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export function deleteGroup(token: string, id: string) {
  return apiFetch<void>(`api/identity/groups/${id}`, token, { method: "DELETE" });
}

export function listAvailableRoleNames(token: string) {
  return apiFetch<string[]>("api/identity/groups/rolenames", token);
}

export function getGroupRoles(token: string, groupId: string) {
  return apiFetch<GroupRole[]>(`api/identity/groups/${groupId}/roles`, token);
}

export function assignRolesToGroup(token: string, groupId: string, roleNames: string[]) {
  return apiFetch<void>("api/identity/groups/roles", token, {
    method: "POST",
    body: JSON.stringify({ groupId, roleNames }),
  });
}

export function removeRolesFromGroup(token: string, groupId: string, roleNames: string[]) {
  return apiFetch<void>(`api/identity/groups/${groupId}/roles`, token, {
    method: "DELETE",
    body: JSON.stringify({ roleNames }),
  });
}

export function addUserToGroup(token: string, groupId: string, userId: string) {
  return apiFetch<void>(`api/identity/groups/${groupId}/users/${userId}`, token, {
    method: "POST",
  });
}

export function removeUserFromGroup(token: string, groupId: string, userId: string) {
  return apiFetch<void>(`api/identity/groups/${groupId}/users/${userId}`, token, {
    method: "DELETE",
  });
}

export function getGroupUsers(token: string, groupId: string) {
  return apiFetch<GroupMember[]>(`api/identity/groups/${groupId}/users`, token);
}

// ---------- Audit logs ----------

export type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: string | null;
  newValues?: string | null;
  userId?: string | null;
  timestamp: string;
};

export type SearchAuditLogsRequest = {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type SearchAuditLogsResult = {
  auditLogs: AuditLogEntry[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export function searchAuditLogs(token: string, request: SearchAuditLogsRequest) {
  return apiFetch<SearchAuditLogsResult>("api/identity/auditlogs/search", token, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ---------- Profile (self-service) ----------

export type ChangeMyInfoRequest = {
  password?: string | null;
  phoneNumber?: string | null;
};

export function changeMyInfo(token: string, request: ChangeMyInfoRequest) {
  return apiFetch<void>("api/identity/profile/change-info", token, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}
