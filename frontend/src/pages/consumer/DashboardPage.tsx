import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useWalletEntries } from '../../hooks/useWallets';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import TxnRow from '../../components/consumer/TxnRow';
import { fmtMoney, greeting } from '../../utils/format';
import type { WalletResponse } from '../../types/api';

const ArrowDown = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-emerald-600">
    <path d="M8 3v10M4 9l4 4 4-4"/>
  </svg>
);
const ArrowRight = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M3 8h10M9 4l4 4-4 4"/>
  </svg>
);

function WalletCard({ w }: { w: WalletResponse }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{w.currency} Wallet</div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${w.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {w.status}
        </span>
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{w.id}</div>
      <div className="mt-3">
        <div className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {fmtMoney(w.availableBalance, w.currency)}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Available <span className="text-slate-700 font-medium">{fmtMoney(w.availableBalance, w.currency)}</span>
          {w.reservedBalance > 0 && (
            <span className="ml-2 text-amber-600">· {fmtMoney(w.reservedBalance, w.currency)} reserved</span>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to={`/top-up?walletId=${w.id}`}
          className="h-9 px-3 text-sm inline-flex items-center justify-center gap-1.5 rounded-lg font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowDown />Top Up
        </Link>
        <Link
          to="/send"
          className="h-9 px-3 text-sm inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-indigo-600 border border-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Send <ArrowRight />
        </Link>
      </div>
    </div>
  );
}

function RecentTxns({ walletId }: { walletId: string }) {
  const { data: entries, isLoading } = useWalletEntries(walletId);
  const recent = entries?.slice(0, 5) ?? [];

  if (isLoading) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  if (!recent.length) return <div className="py-8 text-center text-sm text-slate-400">No transactions yet.</div>;

  return (
    <div className="divide-y divide-slate-100 px-4">
      {recent.map(e => <TxnRow key={e.id} entry={e} />)}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: wallets, isLoading } = useWallets(user!.id);

  const primaryWallet = wallets?.[0];

  return (
    <ConsumerLayout>
      {/* Greeting */}
      <div className="mb-5">
        <div className="text-[22px] font-semibold tracking-tight">
          {greeting()}, {user?.username}
        </div>
        <div className="text-sm text-slate-500 mt-0.5">
          {wallets
            ? `You have ${wallets.length} active wallet${wallets.length !== 1 ? 's' : ''}.`
            : 'Loading your wallets…'}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-5 gap-6 mt-2">

        {/* Left — wallet cards */}
        <div className="col-span-2 space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Your Wallets</div>
          {isLoading ? (
            <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ) : wallets && wallets.length > 0 ? (
            wallets.map(w => <WalletCard key={w.id} w={w} />)
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No wallets yet.
            </div>
          )}
        </div>

        {/* Right — recent transactions */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-base font-semibold tracking-tight">Recent Transactions</div>
              <div className="text-xs text-slate-500 mt-0.5">Latest activity</div>
            </div>
            <Link to="/history" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View all →
            </Link>
          </div>
          {primaryWallet ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <RecentTxns walletId={primaryWallet.id} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No transactions yet.
            </div>
          )}
        </div>

      </div>
    </ConsumerLayout>
  );
}
