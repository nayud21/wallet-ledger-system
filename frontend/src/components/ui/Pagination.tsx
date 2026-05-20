interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, size, total, onPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const showing = total === 0 ? 0 : Math.min((page + 1) * size, total);

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 text-[11px] text-slate-500">
      <div>
        Showing <span className="num text-slate-700">{showing}</span> of{' '}
        <span className="num">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="h-6 w-6 grid place-items-center border border-slate-200 rounded hover:bg-slate-50 text-slate-400 disabled:opacity-40"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onPage(i)}
            className={`h-6 w-6 grid place-items-center border border-slate-200 rounded num text-[11px] ${
              i === page ? 'bg-slate-50 text-slate-700' : 'hover:bg-slate-50 text-slate-400'
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          className="h-6 w-6 grid place-items-center border border-slate-200 rounded hover:bg-slate-50 text-slate-400 disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
