import { useState } from 'react';
import { useTransfer, useWallets } from '../../hooks/useWallets';
import Button from '../ui/Button';

interface TransferFormProps {
  fromWalletId?: string;
  onSuccess: () => void;
}

export default function TransferForm({ fromWalletId, onSuccess }: TransferFormProps) {
  const { data: wallets } = useWallets();
  const [from, setFrom] = useState(fromWalletId ?? '');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(crypto.randomUUID());
  const { mutate, isPending, error } = useTransfer();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      {
        fromWalletId: from,
        toWalletId: to,
        amount: parseFloat(amount),
        currency,
        idempotencyKey,
      },
      { onSuccess },
    );
  }

  const selectClass =
    'rounded border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700">From Wallet</span>
        <select
          required
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={selectClass}
        >
          <option value="">Select wallet…</option>
          {wallets?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.id.slice(0, 8)} — {w.currency} ({w.availableBalance.toLocaleString()})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700">To Wallet</span>
        <select
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={selectClass}
        >
          <option value="">Select wallet…</option>
          {wallets?.filter((w) => w.id !== from).map((w) => (
            <option key={w.id} value={w.id}>
              {w.id.slice(0, 8)} — {w.currency}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700">Amount</span>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700">Currency</span>
          <input
            type="text"
            required
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="rounded border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="USD"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700">Idempotency Key</span>
        <div className="flex gap-1.5">
          <input
            type="text"
            required
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => setIdempotencyKey(crypto.randomUUID())}>
            New
          </Button>
        </div>
      </label>

      {error && <p className="text-xs text-red-600">{(error as Error).message}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Processing…' : 'Transfer'}
        </Button>
      </div>
    </form>
  );
}
