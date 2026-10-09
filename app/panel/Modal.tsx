"use client";

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
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={wide ? "modal-card modal-card-wide" : "modal-card"}>
        <div className="modal-card-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" aria-label="Bağla" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
