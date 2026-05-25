import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useWalletEntries } from '../../hooks/useWallets';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import Card from '../../components/consumer/ui/Card';
import Btn from '../../components/consumer/ui/Btn';
import { Icon } from '../../components/consumer/ui/icons';
import WalletListItem from '../../components/consumer/wallets/WalletListItem';
import WalletDetailHero from '../../components/consumer/wallets/WalletDetailHero';
import BalanceTrend from '../../components/consumer/wallets/BalanceTrend';
import WalletDetailsCard from '../../components/consumer/wallets/WalletDetailsCard';
import WalletActivity from '../../components/consumer/wallets/WalletActivity';
import { enrichWallet } from '../../components/consumer/wallets/types';
import { buildBalanceSeries } from '../../utils/balanceSeries';
import { fmtMoney } from '../../utils/format';

const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  VND: 1 / 25440,
};

function toUsd(amount: number, currency: string): number {
  const r = USD_RATES[currency] ?? 1;
  return amount * r;
}

export default function WalletsPage() {
  const { user } = useAuth();
  const { data: walletsRaw, isLoading } = useWallets(user!.id);
  const wallets = useMemo(
    () => (walletsRaw ?? []).map((w, i) => enrichWallet(w, i)),
    [walletsRaw],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const selected = wallets.find((x) => x.id === selectedId) ?? wallets[0];
  const { data: entries, isLoading: entriesLoading } = useWalletEntries(selected?.id ?? null);
  const entriesList = entries ?? [];

  const { points: spark, monthChange } = useMemo(
    () => (selected ? buildBalanceSeries(entriesList, selected.availableBalance, 30) : { points: [], monthChange: 0 }),
    [entriesList, selected],
  );

  const flatSpark = (bal: number) => Array(30).fill(bal);

  const usdEq = useMemo(
    () => wallets.reduce((acc, x) => acc + toUsd(x.availableBalance + x.reservedBalance, x.currency), 0),
    [wallets],
  );
  const availEq = useMemo(
    () => wallets.reduce((acc, x) => acc + toUsd(x.availableBalance, x.currency), 0),
    [wallets],
  );
  const activeCount = wallets.filter((x) => x.status === 'ACTIVE').length;
  const availPct = usdEq > 0 ? (availEq / usdEq) * 100 : 0;

  return (
    <ConsumerLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 leading-tight">Wallets</h1>
            <p className="text-sm text-slate-500 mt-1">
              <span className="num text-slate-700 font-medium">{wallets.length}</span> wallets ·{' '}
              <span className="num text-slate-700 font-medium">{activeCount}</span> active ·{' '}
              <span className="num text-slate-700 font-medium">{wallets.length - activeCount}</span> frozen
            </p>
          </div>
          <div className="flex items-center gap-2 self-center">
            <Btn variant="secondary" size="md"><Icon.Exchange className="w-3.5 h-3.5" />Transfer between</Btn>
            <Btn variant="primary" size="md"><Icon.Plus className="w-3.5 h-3.5" />New wallet</Btn>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 sm:col-span-6 lg:col-span-3 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Total net worth</div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">USD eq.</span>
            </div>
            <div className="mt-2 text-[24px] font-bold tracking-tight num text-slate-900">{fmtMoney(usdEq)}</div>
            <div className="text-xs text-slate-500 mt-0.5">across {wallets.length} wallets</div>
          </Card>

          <Card className="col-span-12 sm:col-span-6 lg:col-span-3 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Total available</div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 num">{availPct.toFixed(1)}%</span>
            </div>
            <div className="mt-2 text-[24px] font-bold tracking-tight num text-emerald-700">{fmtMoney(availEq)}</div>
            <div className="text-xs text-slate-500 mt-0.5">net of reservations</div>
          </Card>

          <Card className="col-span-12 sm:col-span-6 lg:col-span-3 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Active wallets</div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 num">
                {wallets.length === 0 ? 0 : Math.round((activeCount / wallets.length) * 100)}%
              </span>
            </div>
            <div className="mt-2 text-[24px] font-bold tracking-tight num text-slate-900">
              {activeCount} <span className="text-slate-400 text-lg font-medium">/ {wallets.length}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {wallets.length - activeCount > 0 ? `${wallets.length - activeCount} frozen · review needed` : 'all wallets active'}
            </div>
          </Card>

          <Card className="col-span-12 sm:col-span-6 lg:col-span-3 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-slate-600 font-semibold">30-day change</div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 h-5 rounded ${monthChange >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-600 bg-rose-100'}`}>
                {monthChange >= 0 ? <Icon.ArrowUp className="w-3 h-3" /> : <Icon.ArrowDown className="w-3 h-3" />}
                {(Math.abs(monthChange) * 100).toFixed(1)}%
              </span>
            </div>
            <div className={`mt-2 text-[24px] font-bold tracking-tight num ${monthChange >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {monthChange >= 0 ? '+' : '−'}{fmtMoney(Math.abs(selected ? selected.availableBalance * monthChange : 0), selected?.currency ?? 'USD')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">selected wallet · 30d</div>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-4">
            <Card className="p-3 shadow-sm">
              <div className="flex items-center justify-between px-1 pb-2.5 mb-2.5 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-900">Your wallets</div>
                <span className="text-xs text-slate-500">
                  <span className="num text-slate-700 font-medium">{wallets.length}</span> total
                </span>
              </div>
              <div className="space-y-2">
                {isLoading && (
                  <div className="h-24 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
                )}
                {wallets.map((x) => {
                  const isSelected = x.id === selected?.id;
                  return (
                    <WalletListItem
                      key={x.id}
                      w={x}
                      active={isSelected}
                      onSelect={() => setSelectedId(x.id)}
                      spark={isSelected ? spark : flatSpark(x.availableBalance)}
                      monthChange={isSelected ? monthChange : 0}
                    />
                  );
                })}
                {!isLoading && wallets.length === 0 && (
                  <div className="text-sm text-slate-500 px-2 py-6 text-center">No wallets yet.</div>
                )}
              </div>
              <button className="mt-2 w-full h-10 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl text-sm font-medium text-slate-500 hover:text-indigo-700 transition-all flex items-center justify-center gap-1.5">
                <Icon.Plus className="w-3.5 h-3.5" />Add new wallet
              </button>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 px-1 py-2 rounded-lg bg-slate-50">
                  <Icon.Help className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="text-[11px] text-slate-600 leading-snug">
                    Need help?{' '}
                    <button className="text-indigo-700 hover:text-indigo-900 font-medium">Read about multi-wallet limits →</button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-4">
            {selected ? (
              <>
                <WalletDetailHero
                  w={selected}
                  hidden={hidden}
                  onToggleHide={() => setHidden((h) => !h)}
                  spark={spark}
                  monthChange={monthChange}
                />
                <div className="grid grid-cols-12 gap-4">
                  <BalanceTrend data={spark} monthChange={monthChange} currency={selected.currency} />
                  <WalletDetailsCard w={selected} />
                </div>
                <WalletActivity entries={entriesList} loading={entriesLoading} currency={selected.currency} />
              </>
            ) : (
              <Card className="p-12 text-center text-sm text-slate-500">Select a wallet to view details.</Card>
            )}
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
