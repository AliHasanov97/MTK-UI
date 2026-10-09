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
          // Columns still covered by a previous row's rowSpan have no cell of
          // their own in this row's DOM — track how many rows they still span
          // so later cells in the row don't get shifted onto the wrong label.
          const rowSpanRemaining: number[] = [];
          Array.from(body.rows).forEach((row) => {
            let columnIndex = 0;
            Array.from(row.cells).forEach((cell) => {
              while (rowSpanRemaining[columnIndex] > 0) {
                rowSpanRemaining[columnIndex] -= 1;
                columnIndex += 1;
              }

              if (cell.colSpan > 1) {
                cell.removeAttribute("data-label");
              } else {
                const label = labels[columnIndex] || "Məlumat";
                if (cell.dataset.label !== label) cell.dataset.label = label;
              }

              if (cell.rowSpan > 1) {
                for (let c = columnIndex; c < columnIndex + cell.colSpan; c++) {
                  rowSpanRemaining[c] = cell.rowSpan - 1;
                }
              }
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
