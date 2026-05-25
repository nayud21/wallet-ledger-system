import { useNavigate } from 'react-router-dom';
import { Icon } from './ui/icons';

type Tone = 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';

const tones: Record<Tone, string> = {
  indigo:  'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100',
  emerald: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100',
  violet:  'text-violet-600 bg-violet-50 group-hover:bg-violet-100',
  amber:   'text-amber-700 bg-amber-50 group-hover:bg-amber-100',
  rose:    'text-rose-600 bg-rose-50 group-hover:bg-rose-100',
  slate:   'text-slate-700 bg-slate-100 group-hover:bg-slate-200',
};

function QuickAction({
  icon: I,
  label,
  sub,
  tone,
  onClick,
}: {
  icon: (p: React.SVGProps<SVGSVGElement>) => JSX.Element;
  label: string;
  sub: string;
  tone: Tone;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-all text-left"
    >
      <div className={`w-9 h-9 rounded-lg grid place-items-center transition-colors ${tones[tone]}`}>
        <I className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500 truncate">{sub}</div>
      </div>
      <Icon.ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

export default function QuickActionsCard() {
  const navigate = useNavigate();
  return (
    <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col p-4">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">Quick actions</div>
          <div className="text-[11px] text-slate-500">Common operations</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-0.5 flex-1">
        <QuickAction icon={Icon.Send}     label="Send money" sub="to a wallet or contact"  tone="indigo"  onClick={() => navigate('/send')} />
        <QuickAction icon={Icon.TopUp}    label="Top up"     sub="card · bank · Apple Pay" tone="emerald" onClick={() => navigate('/top-up')} />
        <QuickAction icon={Icon.Withdraw} label="Withdraw"   sub="to your linked bank"     tone="violet" />
        <QuickAction icon={Icon.Exchange} label="Exchange"   sub="USD ↔ VND, EUR, GBP"     tone="amber"   onClick={() => navigate('/exchange')} />
        <QuickAction icon={Icon.QR}       label="QR code"    sub="receive in person"       tone="slate" />
      </div>
    </div>
  );
}
