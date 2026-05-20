import { IconWallet, IconLedger, IconInbox, IconRecon } from '../icons';

type Screen = 'wallets' | 'ledger' | 'inbox' | 'recon';

interface SidebarProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { key: Screen; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; badge: string; badgeTone?: 'amber' }[] = [
  { key: 'wallets', label: 'Wallets',        icon: IconWallet, badge: '10' },
  { key: 'ledger',  label: 'Ledger',         icon: IconLedger, badge: '1.2k' },
  { key: 'inbox',   label: 'Inbox',          icon: IconInbox,  badge: '4' },
  { key: 'recon',   label: 'Reconciliation', icon: IconRecon,  badge: '3', badgeTone: 'amber' },
];

const configItems = ['Currencies', 'Accounts', 'API Keys', 'Webhooks'];

export default function Sidebar({ screen, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="h-11 px-3 flex items-center gap-2 border-b border-slate-200">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center text-white text-[11px] font-bold font-mono">
          M
        </div>
        <div className="font-semibold text-[13px] tracking-tight">MyWallet</div>
        <span className="ml-auto text-[10px] text-slate-400 font-mono">v2.4.1</span>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          Operations
        </div>
        {navItems.map((item) => {
          const active = screen === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-2 px-2 h-7 rounded text-xs font-medium transition-colors ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    item.badgeTone === 'amber'
                      ? 'bg-amber-100 text-amber-800'
                      : active
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          Configuration
        </div>
        {configItems.map((label) => (
          <button
            key={label}
            className="w-full flex items-center gap-2 px-2 h-7 rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <span className="w-1 h-1 rounded-full bg-slate-300 ml-1.5 mr-1.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-200">
        <div className="px-2 py-1.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-snug">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700">All systems normal</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">last check 32s ago</span>
        </div>
      </div>
    </aside>
  );
}
