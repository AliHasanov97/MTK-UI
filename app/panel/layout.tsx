"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth/AuthContext";
import { PanelShell } from "./PanelShell";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace("/");
    }
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return (
      <main className="panel-loading">
        <p>Yüklənir…</p>
      </main>
    );
  }

  return <PanelShell>{children}</PanelShell>;
}
