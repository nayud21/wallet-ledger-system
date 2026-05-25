import { ReactNode } from 'react';
import Card from '../ui/Card';
import Btn from '../ui/Btn';
import { Icon } from '../ui/icons';
import { fmtMoney } from '../../../utils/format';
import type { EnrichedWallet } from './types';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</dt>
      <dd className="text-right min-w-0 truncate ml-3">{children}</dd>
    </div>
  );
}

function LimitBar({ label, used, max, cur }: { label: string; used: number; max: number; cur: string }) {
  const pct = max === 0 ? 0 : Math.min(100, (used / max) * 100);
  const high = pct >= 75;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="num text-slate-700">
          <span className="font-semibold text-slate-900">{fmtMoney(used, cur)}</span>{' '}
          <span className="text-slate-400">/ {max === 0 ? '—' : fmtMoney(max, cur)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${high ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function WalletDetailsCard({ w }: { w: EnrichedWallet }) {
  const frozen = w.status === 'FROZEN';
  return (
    <Card className="col-span-12 xl:col-span-5 p-4 flex flex-col gap-4">
      <div>
        <div className="text-sm font-semibold tracking-tight text-slate-900">Account details</div>
        <dl className="mt-3 divide-y divide-slate-100">
          <DetailRow label="Wallet ID"><span className="font-mono text-xs text-slate-800">{w.id}</span></DetailRow>
          <DetailRow label="Account number"><span className="font-mono text-xs text-slate-800">{w.account}</span></DetailRow>
          <DetailRow label="Routing"><span className="font-mono text-xs text-slate-800">{w.routing}</span></DetailRow>
          <DetailRow label="Currency"><span className="text-xs font-medium text-slate-800 font-mono">{w.currency}</span></DetailRow>
          <DetailRow label="Updated"><span className="text-xs text-slate-700 num">{w.createdLabel}</span></DetailRow>
          <DetailRow label="Tag">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{w.tag}</span>
          </DetailRow>
        </dl>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <div className="text-sm font-semibold tracking-tight text-slate-900">Limits &amp; holds</div>
        <div className="mt-3 space-y-3">
          <LimitBar label="Daily send"      used={w.limits.dailySend.used}      max={w.limits.dailySend.max}      cur={w.currency} />
          <LimitBar label="Monthly receive" used={w.limits.monthlyReceive.used} max={w.limits.monthlyReceive.max} cur={w.currency} />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
        <Btn variant="outline" size="sm" disabled={frozen}><Icon.Settings className="w-3.5 h-3.5" />Settings</Btn>
        <Btn variant="outline" size="sm" disabled={frozen}>Export</Btn>
        <Btn variant="outline" size="sm" disabled={frozen || w.primary}>Set primary</Btn>
        <Btn
          variant="outline"
          size="sm"
          className={frozen ? '' : 'text-rose-600 hover:bg-rose-50 hover:border-rose-300 border-rose-200'}
        >
          {frozen ? 'Unfreeze' : 'Freeze'}
        </Btn>
      </div>
    </Card>
  );
}
