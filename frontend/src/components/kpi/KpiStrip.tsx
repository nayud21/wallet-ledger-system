import type { WalletResponse } from '../../types/api';

interface KpiStripProps {
  wallets: WalletResponse[];
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function KpiStrip({ wallets }: KpiStripProps) {
  const totalAvailable = wallets.reduce((s, w) => s + w.availableBalance, 0);
  const totalReserved = wallets.reduce((s, w) => s + w.reservedBalance, 0);
  const frozenCount = wallets.filter((w) => w.status === 'FROZEN').length;
  const walletsWithHolds = wallets.filter((w) => w.reservedBalance > 0).length;

  const tiles = [
    { label: 'Total available', value: fmtMoney(totalAvailable), sub: `across ${new Set(wallets.map(w => w.currency)).size} currencies` },
    { label: 'Total reserved',  value: fmtMoney(totalReserved),  sub: `${walletsWithHolds} wallets with holds` },
    { label: 'Net inflow 24h',  value: '+ 8,420.00',             sub: 'vs −1,205.00 yesterday', tone: 'green' as const },
    { label: 'Frozen wallets',  value: String(frozenCount),      sub: 'review queue', tone: 'amber' as const },
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
