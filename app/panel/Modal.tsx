"use client";

import { useId } from "react";

export function Modal({
  title,
  wide,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={wide ? "modal-card modal-card-wide" : "modal-card"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-card-head">
          <div className="modal-card-heading">
            <span className="modal-eyebrow">Panel əməliyyatı</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Bağla" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-card-body">{children}</div>
      </div>
    </div>
  );
}
