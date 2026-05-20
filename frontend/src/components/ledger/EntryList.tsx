import type { LedgerEntryResponse } from '../../types/api';

interface EntryListProps {
  entries: LedgerEntryResponse[];
}

export default function EntryList({ entries }: EntryListProps) {
  if (entries.length === 0) {
    return <p className="text-xs text-slate-400">No entries found.</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th className="pb-1 pr-2 font-medium">Dir</th>
          <th className="pb-1 pr-2 font-medium text-right">Amount</th>
          <th className="pb-1 pr-2 font-medium">Ccy</th>
          <th className="pb-1 pr-2 font-medium">Ref</th>
          <th className="pb-1 font-medium">Time</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-b border-slate-100">
            <td className={`py-1 pr-2 font-semibold ${e.direction === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
              {e.direction === 'CREDIT' ? '+' : '−'}
            </td>
            <td className={`py-1 pr-2 text-right tabular-nums ${e.direction === 'CREDIT' ? 'text-green-700' : 'text-red-600'}`}>
              {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </td>
            <td className="py-1 pr-2 text-slate-500">{e.currency}</td>
            <td className="py-1 pr-2 text-slate-400 truncate max-w-[80px]">{e.reference ?? '—'}</td>
            <td className="py-1 text-slate-400">
              {new Date(e.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
