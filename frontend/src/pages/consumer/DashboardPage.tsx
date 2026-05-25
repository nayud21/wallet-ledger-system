import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useWalletEntries } from '../../hooks/useWallets';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import HeroWallet from '../../components/consumer/HeroWallet';
import QuickActionsCard from '../../components/consumer/QuickActionsCard';
import KpiCard from '../../components/consumer/KpiCard';
import CashflowCard from '../../components/consumer/CashflowCard';
import TxnPanel from '../../components/consumer/TxnPanel';
import Btn from '../../components/consumer/ui/Btn';
import { Icon } from '../../components/consumer/ui/icons';
import { buildCashflow, buildKpis } from '../../utils/cashflow';
import { fmtMoney, greeting } from '../../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading } = useWallets(user!.id);
  const primaryWallet = wallets?.[0];
  const { data: entries, isLoading: entriesLoading } = useWalletEntries(primaryWallet?.id ?? null);

  const entriesList = entries ?? [];
  const { points: cashflow, rangeLabel } = useMemo(() => buildCashflow(entriesList, 7), [entriesList]);
  const kpis = useMemo(() => buildKpis(entriesList), [entriesList]);

  const last7Net = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let net = 0;
    for (const e of entriesList) {
      if (+new Date(e.createdAt) < cutoff) continue;
      net += e.direction === 'CREDIT' ? e.amount : -e.amount;
    }
    return net;
  }, [entriesList]);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <ConsumerLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900 leading-tight">
              {greeting()}, {user?.username}
            </h1>
            <p className="text-[14px] text-slate-500 mt-1">
              {todayLabel} · You're {last7Net >= 0 ? 'up' : 'down'}{' '}
              <span className={`font-medium num ${last7Net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {last7Net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(last7Net))}
              </span>{' '}
              in the last 7 days.
            </p>
          </div>
          <div className="flex items-center gap-2 self-center">
            <Btn variant="secondary" size="md"><Icon.Filter className="w-3.5 h-3.5" />Filter</Btn>
            <Btn variant="secondary" size="md"><Icon.Download className="w-3.5 h-3.5" />Export</Btn>
            <Btn variant="primary" size="md"><Icon.Send className="w-3.5 h-3.5" />New transfer</Btn>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {primaryWallet ? (
            <HeroWallet wallet={primaryWallet} entries={entriesList} />
          ) : (
            <div className="col-span-12 lg:col-span-8 h-56 rounded-xl border border-slate-200 bg-white animate-pulse" />
          )}
          <QuickActionsCard />
        </div>

        <div className="grid grid-cols-12 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3">
              <KpiCard k={k} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-4">
          <CashflowCard data={cashflow} rangeLabel={`${rangeLabel} · ${primaryWallet?.currency ?? 'USD'}`} />
          <TxnPanel entries={entriesList} loading={walletsLoading || entriesLoading} />
        </div>
      </div>
    </ConsumerLayout>
  );
}
