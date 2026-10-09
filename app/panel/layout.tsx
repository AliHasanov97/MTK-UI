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

  useEffect(() => {
    const updateTableLabels = () => {
      const tables = document.querySelectorAll<HTMLTableElement>(
        ".data-table:not(.purchase-entry-table):not(.hesabat-grid):not(.data-table-nested)",
      );

      tables.forEach((table) => {
        const headerRow = table.tHead?.rows[table.tHead.rows.length - 1];
        if (!headerRow) return;

        const labels = Array.from(headerRow.cells).flatMap((cell) =>
          Array.from({ length: Math.max(1, cell.colSpan) }, () => cell.textContent?.trim() ?? ""),
        );
        if (!labels.some(Boolean)) return;

        table.classList.add("data-table-mobile-cards");
        Array.from(table.tBodies).forEach((body) => {
          Array.from(body.rows).forEach((row) => {
            let columnIndex = 0;
            Array.from(row.cells).forEach((cell) => {
              if (cell.colSpan > 1) {
                cell.removeAttribute("data-label");
                columnIndex += cell.colSpan;
                return;
              }

              const label = labels[columnIndex] || "Məlumat";
              if (cell.dataset.label !== label) cell.dataset.label = label;
              columnIndex += cell.colSpan;
            });
          });
        });
      });
    };

    updateTableLabels();
    const observer = new MutationObserver(updateTableLabels);
    observer.observe(document.querySelector(".panel-shell") ?? document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  if (auth.status !== "authenticated") {
    return (
      <main className="panel-loading">
        <p>Yüklənir…</p>
      </main>
    );
  }

  return <PanelShell>{children}</PanelShell>;
}
