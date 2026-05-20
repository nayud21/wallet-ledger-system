import { useWallet, useWalletEntries } from '../../hooks/useWallets';
import Badge from '../ui/Badge';
import EntryList from '../ledger/EntryList';

interface WalletDetailProps {
  walletId: string;
}

export default function WalletDetail({ walletId }: WalletDetailProps) {
  const { data: wallet, isLoading: wLoading, error: wError } = useWallet(walletId);
  const { data: entries, isLoading: eLoading, error: eError } = useWalletEntries(walletId);

  if (wLoading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (wError) return <p className="text-sm text-red-600">{(wError as Error).message}</p>;
  if (!wallet) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">
            {wallet.currency} Wallet
          </h3>
          <Badge tone={wallet.status === 'ACTIVE' ? 'green' : 'slate'} dot>{wallet.status}</Badge>
        </div>
        <p className="font-mono text-xs text-slate-400">{wallet.id}</p>
        <p className="mt-0.5 font-mono text-xs text-slate-400">User: {wallet.userId.slice(0, 8)}…</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Available</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {wallet.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <p className="text-xs text-slate-400">{wallet.currency}</p>
        </div>
        <div className="rounded border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Reserved</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-400">
            {wallet.reservedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <p className="text-xs text-slate-400">{wallet.currency}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ledger Entries
        </h4>
        {eLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {eError && <p className="text-sm text-red-600">{(eError as Error).message}</p>}
        {entries && <EntryList entries={entries} />}
      </div>
    </div>
  );
}
