"use client";

import { useAuth } from "../../lib/auth/AuthContext";
import { hasAnyRole, ROLE_LABELS, type Role } from "../../lib/auth/roles";

export function RequireRole({
  allowed,
  children,
}: {
  allowed: Role[];
  children: React.ReactNode;
}) {
  const auth = useAuth();

  if (auth.status !== "authenticated") return null;

  if (!hasAnyRole(auth.user.roles, allowed)) {
    return (
      <div className="panel-denied">
        <h2>İcazəniz yoxdur</h2>
        <p>
          Bu bölməyə yalnız {allowed.map((role) => ROLE_LABELS[role]).join(", ")}{" "}
          roluna sahib istifadəçilər daxil ola bilər.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
