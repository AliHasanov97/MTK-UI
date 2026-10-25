"use client";

import { LoginIcon } from "./icons";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../lib/auth/AuthContext";

export function HeaderAuth() {
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return <UserMenu />;
  }

  return (
    <button
      type="button"
      className="header-cta"
      onClick={() => auth.login()}
      disabled={auth.status === "loading"}
    >
      <LoginIcon size={16} />
      Daxil ol
    </button>
  );
}
