export const ROLES = {
  ADMIN: "admin",
  ACCOUNTANT: "accountant",
  OWNER: "owner",
  STAFF: "staff",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "İdarəçi",
  accountant: "Mühasib",
  owner: "Mənzil sahibi",
  staff: "İşçi",
};

export function hasAnyRole(userRoles: string[], allowed: Role[]) {
  return allowed.some((role) => userRoles.includes(role));
}
