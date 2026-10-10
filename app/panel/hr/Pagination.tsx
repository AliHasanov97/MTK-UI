"use client";

export function Pagination({
  page,
  pageCount,
  totalCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  totalCount: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, pageCount);
  return (
    <div className="panel-pagination">
      <span>
        Səhifə {page}/{pages} · {totalCount} qeyd
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="panel-btn panel-btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Əvvəlki
        </button>
        <button
          type="button"
          className="panel-btn panel-btn-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Növbəti
        </button>
      </div>
    </div>
  );
}
