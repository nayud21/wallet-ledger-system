import { useState } from 'react';
import { useTransactions, useReversal } from '../hooks/useLedger';
import type { LedgerTransactionResponse } from '../types/api';
import TransactionTable from '../components/ledger/TransactionTable';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const PAGE_SIZE = 20;

export default function LedgerPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useTransactions(page, PAGE_SIZE);
  const { mutate: reverse, isPending: reversing, error: reverseError } = useReversal();

  const [reversalTarget, setReversalTarget] = useState<LedgerTransactionResponse | null>(null);
  const [reversalKey, setReversalKey] = useState<string>(crypto.randomUUID());
  const [reversalReason, setReversalReason] = useState('');

  function openReversal(tx: LedgerTransactionResponse) {
    setReversalTarget(tx);
    setReversalKey(crypto.randomUUID());
    setReversalReason('');
  }

  function closeReversal() {
    setReversalTarget(null);
  }

  function handleReverse(e: React.FormEvent) {
    e.preventDefault();
    if (!reversalTarget) return;
    reverse(
      {
        ledgerTransactionId: reversalTarget.id,
        idempotencyKey: reversalKey,
        reason: reversalReason,
      },
      { onSuccess: closeReversal },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-base font-semibold">Ledger Transactions</h1>

      <div className="rounded border border-slate-200 bg-white p-3 overflow-auto">
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
        {data && (
          <>
            <TransactionTable transactions={data.data} onReverse={openReversal} />
            <div className="mt-3 flex justify-end">
              <Pagination
                page={data.page}
                size={data.size}
                total={data.total}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </div>

      {reversalTarget && (
        <Modal title="Reverse Transaction" onClose={closeReversal}>
          <form onSubmit={handleReverse} className="flex flex-col gap-3 text-sm">
            <div className="rounded bg-slate-50 px-3 py-2 text-xs">
              <p className="text-slate-500">Transaction #{reversalTarget.id}</p>
              <p className="font-medium text-slate-700">{reversalTarget.description}</p>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-700">Reason</span>
              <input
                type="text"
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Customer dispute"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-700">Idempotency Key</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={reversalKey}
                  onChange={(e) => setReversalKey(e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => setReversalKey(crypto.randomUUID())}>
                  New
                </Button>
              </div>
            </label>

            {reverseError && <p className="text-xs text-red-600">{(reverseError as Error).message}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={closeReversal}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={reversing}>
                {reversing ? 'Reversing…' : 'Confirm Reversal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
