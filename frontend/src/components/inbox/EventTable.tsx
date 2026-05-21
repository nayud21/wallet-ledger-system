import type { PaymentEventResponse } from '../../types/api';

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  PROCESSED: 'bg-emerald-100 text-emerald-700',
  FAILED:    'bg-red-100 text-red-700',
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}

interface EventTableProps {
  events: PaymentEventResponse[];
}

export default function EventTable({ events }: EventTableProps) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No events found.</p>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
          <th className="px-3 py-2 font-medium">ID</th>
          <th className="px-3 py-2 font-medium">Provider</th>
          <th className="px-3 py-2 font-medium">External Ref</th>
          <th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {events.map((e) => (
          <tr key={e.id} className="row-hover">
            <td className="px-3 py-2 font-mono text-slate-400">{e.id}</td>
            <td className="px-3 py-2 font-medium text-slate-700">{e.provider}</td>
            <td className="px-3 py-2 font-mono text-slate-500 truncate max-w-[200px]">{e.externalRef}</td>
            <td className="px-3 py-2">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[e.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {e.status}
              </span>
            </td>
            <td className="px-3 py-2 text-slate-500">{fmtDate(e.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
