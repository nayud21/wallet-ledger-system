import { useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import EventTable from '../components/inbox/EventTable';

const STATUS_TABS = [
  { label: 'All',       value: undefined },
  { label: 'Pending',   value: 'PENDING' },
  { label: 'Processed', value: 'PROCESSED' },
  { label: 'Failed',    value: 'FAILED' },
] as const;

const PAGE_SIZE = 20;

export default function InboxPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useEvents(page, PAGE_SIZE, status);

  function handleTabChange(value: string | undefined) {
    setStatus(value);
    setPage(0);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Webhook Inbox</h1>
          <p className="text-[11px] text-slate-500">
            {data ? `${data.total} event${data.total !== 1 ? 's' : ''}` : '—'} total
          </p>
        </div>
        <div className="flex gap-0 border border-slate-200 rounded overflow-hidden">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => handleTabChange(tab.value)}
              className={`h-7 px-3 text-[12px] border-r border-slate-200 last:border-r-0 transition-colors ${
                status === tab.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded border border-slate-200 bg-white">
        {isLoading && <p className="py-8 text-center text-sm text-slate-400">Loading…</p>}
        {error && <p className="py-8 text-center text-sm text-red-600">{(error as Error).message}</p>}
        {data && <EventTable events={data.data} />}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="h-7 px-3 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="h-7 px-3 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
