import type { LedgerTransactionResponse } from '../../types/api';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface TransactionTableProps {
  transactions: LedgerTransactionResponse[];
  onReverse: (tx: LedgerTransactionResponse) => void;
}

export default function TransactionTable({ transactions, onReverse }: TransactionTableProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500">No transactions found.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th className="pb-2 pr-3 font-medium">ID</th>
          <th className="pb-2 pr-3 font-medium">Idempotency Key</th>
          <th className="pb-2 pr-3 font-medium">Description</th>
          <th className="pb-2 pr-3 font-medium">Status</th>
          <th className="pb-2 pr-3 font-medium">Created</th>
          <th className="pb-2 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
            <td className="py-1.5 pr-3 tabular-nums text-slate-500">{tx.id}</td>
            <td className="py-1.5 pr-3 font-mono text-xs text-slate-500">
              {tx.idempotencyKey.slice(0, 12)}…
            </td>
            <td className="py-1.5 pr-3 max-w-[220px] truncate text-slate-700">{tx.description}</td>
            <td className="py-1.5 pr-3">
              <Badge tone={tx.status === 'POSTED' ? 'green' : tx.status === 'REVERSED' ? 'slate' : 'amber'} dot>
                {tx.status}
              </Badge>
            </td>
            <td className="py-1.5 pr-3 text-xs text-slate-500">
              {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
            </td>
            <td className="py-1.5">
              {tx.status !== 'REVERSED' && (
                <Button variant="danger" size="sm" onClick={() => onReverse(tx)}>
                  Reverse
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
