import { useAuth } from "./AuthContext";

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

/** admin, building-manager — HR/Binalar/Anbar/Müqavilə/Tarif/Xərc/Əlavə-gəlir
 *  yaratma-redaktə-silmə, haqq yaratma/ləğvi. Mühasibin bu hüququ yoxdur. */
export function useCanDoEverything() {
  const auth = useAuth();
  return auth.status === "authenticated" && hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER]);
}

/** admin, building-manager, accountant — yalnız sakin/tədarükçü ödənişi yaratmaq. */
export function useCanPay() {
  const auth = useAuth();
  return (
    auth.status === "authenticated" &&
    hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT])
  );
}
