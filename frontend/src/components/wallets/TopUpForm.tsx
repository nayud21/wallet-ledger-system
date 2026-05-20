import { useState } from 'react';
import { useTopUp } from '../../hooks/useWallets';
import type { WalletResponse } from '../../types/api';
import Button from '../ui/Button';
import { IconArrowDown, IconRefresh, IconWarn, IconCheck } from '../icons';

interface TopUpFormProps {
  wallet: WalletResponse;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

export default function TopUpForm({ wallet }: TopUpFormProps) {
  const [amount, setAmount] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending, error } = useTopUp();

  const parsedAmount = parseFloat(amount);
  const limitErr = amount && parsedAmount > 1_000_000
    ? `Amount exceeds daily top-up limit (${fmtMoney(1_000_000)} ${wallet.currency}).`
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (limitErr) return;
    mutate(
      {
        walletId: wallet.id,
        amount: parsedAmount,
        currency: wallet.currency,
        externalRef: externalRef || undefined,
        idempotencyKey,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setAmount('');
          setIdempotencyKey(crypto.randomUUID());
          setTimeout(() => setSubmitted(false), 1800);
        },
      },
    );
  }

  return (
    <form className="space-y-2.5" onSubmit={handleSubmit}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">Amount</label>
          <span className="text-[10px] text-slate-400">{wallet.currency}</span>
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-mono">$</span>
          <input
            className="h-7 w-full pl-5 pr-2 text-xs bg-white border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 num"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {limitErr && (
          <div className="text-[11px] text-red-600 mt-1 flex items-start gap-1">
            <IconWarn className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{limitErr}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
          External Ref
        </label>
        <input
          className="h-7 w-full px-2 text-xs bg-white border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
          placeholder="stripe_pi_3OAB…"
          value={externalRef}
          onChange={(e) => setExternalRef(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">Idempotency Key</label>
          <span className="text-[10px] text-slate-400">auto-generated</span>
        </div>
        <div className="flex gap-1">
          <input
            className="h-7 flex-1 px-2 text-xs bg-white border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-[10.5px] num"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setIdempotencyKey(crypto.randomUUID())}
            className="h-7 w-7 shrink-0 grid place-items-center border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
            title="Regenerate"
          >
            <IconRefresh className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-red-600 flex items-start gap-1">
          <IconWarn className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{(error as Error).message}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button variant="primary" size="md" type="submit" disabled={isPending || !!limitErr}>
          <IconArrowDown className="w-3.5 h-3.5" />
          {isPending ? 'Processing…' : 'Top-up wallet'}
        </Button>
        {submitted && (
          <span className="text-[11px] text-emerald-700 flex items-center gap-1">
            <IconCheck className="w-3 h-3" />
            Queued
          </span>
        )}
      </div>
    </form>
  );
}
