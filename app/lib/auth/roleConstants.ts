export const ROLES = {
  ADMIN: "admin",
  ACCOUNTANT: "accountant",
  OWNER: "owner",
  BUILDING_MANAGER: "building-manager",
  EMPLOYEE: "employee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "İdarəçi",
  accountant: "Mühasib",
  owner: "Mənzil sahibi",
  "building-manager": "Komandant",
  employee: "İşçi",
};

export function hasAnyRole(userRoles: string[], allowed: Role[]) {
  return allowed.some((role) => userRoles.includes(role));
}
