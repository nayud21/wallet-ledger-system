import { useWalletStats } from '../../hooks/useWallets';

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function KpiStrip() {
  const { data: stats, isLoading } = useWalletStats();

  const tiles = [
    {
      label: 'Total wallets',
      value: isLoading ? '—' : String(stats!.totalWallets),
      sub: `${isLoading ? '—' : stats!.activeWallets} active`,
    },
    {
      label: 'Active wallets',
      value: isLoading ? '—' : String(stats!.activeWallets),
      sub: `${isLoading ? '—' : stats!.totalWallets - stats!.activeWallets} frozen`,
      tone: 'green' as const,
    },
    {
      label: 'Net inflow 24h',
      value: isLoading ? '—' : `+ ${fmtMoney(stats!.totalVolume24h)}`,
      sub: 'credited in last 24h',
      tone: 'green' as const,
    },
    {
      label: 'Pending events',
      value: isLoading ? '—' : String(stats!.pendingEvents),
      sub: 'webhook inbox',
      tone: stats && stats.pendingEvents > 0 ? 'amber' as const : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((k) => (
        <div key={k.label} className="bg-white border border-slate-200 rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{k.label}</div>
          <div
            className={`mt-1 text-[18px] font-semibold num tracking-tight ${
              k.tone === 'green' ? 'text-emerald-700' : k.tone === 'amber' ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {k.value}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
