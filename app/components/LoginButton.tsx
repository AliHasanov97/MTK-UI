"use client";

import type { ReactNode } from "react";
import { useAuth } from "../lib/auth/AuthContext";

export function LoginButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return (
      <a className={className} href="/panel">
        Panelə keç →
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => auth.login()}
      disabled={auth.status === "loading"}
    >
      {children}
    </button>
  );
}
