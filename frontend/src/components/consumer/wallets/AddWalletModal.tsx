import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '../ui/icons';
import Btn from '../ui/Btn';
import { useCreateWallet } from '../../../hooks/useWallets';
import { useAuth } from '../../../context/AuthContext';

/* ─── Currency catalog ─── */
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',         flag: '🇺🇸', region: 'Americas', popular: true,  fx: 1.0000,  custodian: 'Cross River Bank' },
  { code: 'EUR', name: 'Euro',              flag: '🇪🇺', region: 'Europe',   popular: true,  fx: 0.9259,  custodian: 'Modulr Finance B.V.' },
  { code: 'GBP', name: 'British Pound',     flag: '🇬🇧', region: 'Europe',   popular: true,  fx: 0.7943,  custodian: 'ClearBank Ltd.' },
  { code: 'VND', name: 'Vietnamese Đồng',   flag: '🇻🇳', region: 'Asia',     popular: true,  fx: 25440,   custodian: 'TPBank' },
  { code: 'JPY', name: 'Japanese Yen',      flag: '🇯🇵', region: 'Asia',     popular: false, fx: 156.42,  custodian: 'Sumitomo Mitsui' },
  { code: 'SGD', name: 'Singapore Dollar',  flag: '🇸🇬', region: 'Asia',     popular: false, fx: 1.3496,  custodian: 'DBS Bank Ltd.' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', region: 'Oceania',  popular: false, fx: 1.5081,  custodian: 'Macquarie Bank' },
  { code: 'MXN', name: 'Mexican Peso',      flag: '🇲🇽', region: 'Americas', popular: false, fx: 17.0420, custodian: 'BBVA México' },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]['code'];

const TAGS = ['Personal', 'Travel', 'Business', 'Savings', 'Custom'] as const;
const ACCENT_COLORS = ['indigo', 'emerald', 'violet', 'rose', 'amber', 'sky', 'slate'] as const;
type Accent = (typeof ACCENT_COLORS)[number];

const ACCENT_BG: Record<Accent, string> = {
  indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
  rose: 'bg-rose-500', amber: 'bg-amber-500', sky: 'bg-sky-500', slate: 'bg-slate-700',
};
const ACCENT_RING: Record<Accent, string> = {
  indigo: 'ring-indigo-500', emerald: 'ring-emerald-500', violet: 'ring-violet-500',
  rose: 'ring-rose-500', amber: 'ring-amber-500', sky: 'ring-sky-500', slate: 'ring-slate-700',
};

function fmtAmt(n: number, code: CurrencyCode) {
  if (code === 'VND') return `₫${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`;
  if (code === 'JPY') return `¥${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`;
  const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AUD: 'A$', MXN: 'MX$' };
  return `${sym[code] ?? ''}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

/* ─── Step rail ─── */
function StepRail({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const done = i < step;
        const cur = i === step;
        return (
          <div key={i} className="flex items-center gap-2 flex-1 min-w-0 last:flex-none">
            <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold shrink-0 transition-colors
              ${done ? 'bg-emerald-600 text-white' : cur ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
              {done ? <CheckIcon /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline truncate ${cur ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`}>{l}</span>
            {i < labels.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.5 3.5L13 4.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Wallet preview card ─── */
function WalletPreview({ currency, nickname, tag, accent, primary }: {
  currency: CurrencyCode; nickname: string; tag: string; accent: Accent; primary: boolean;
}) {
  const c = CURRENCIES.find(x => x.code === currency)!;
  return (
    <div className="rounded-xl text-white relative overflow-hidden border border-slate-800/80 shadow-xl"
      style={{ background: 'linear-gradient(180deg,#0f172a 0%,#020617 100%)' }}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${ACCENT_BG[accent]}`} />
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${ACCENT_BG[accent]}`} />
          <span className="text-slate-300 truncate">{nickname || `${c.code} Wallet`}</span>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <div className="text-[28px] leading-none font-semibold tracking-tight num text-white">{fmtAmt(0, currency)}</div>
          <div className="text-slate-400 text-xs font-medium font-mono pb-1">{currency}</div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 h-6 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-300/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />ACTIVE
          </span>
          <span className="inline-flex text-[11px] font-medium px-2 h-6 rounded-full bg-white/5 text-slate-300 border border-white/10 font-mono">{currency}</span>
          {primary && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 h-6 rounded-full bg-indigo-400/15 text-indigo-200 border border-indigo-300/25">
              ★ PRIMARY
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 h-6 rounded-full bg-white/5 text-slate-300 border border-white/10">
            <span className="text-base leading-none">{c.flag}</span>{tag}
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">Custodian</div>
            <div className="text-slate-200 mt-0.5 truncate">{c.custodian}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">FX (1 USD)</div>
            <div className="text-slate-200 mt-0.5 num font-mono">
              {c.code === 'USD' ? '1.0000' : c.fx.toLocaleString('en-US', { maximumFractionDigits: 2 })} {c.code}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 0: Choose currency ─── */
function Step0Currency({ currencies, currency, setCurrency, search, setSearch, tab, setTab }: {
  currencies: typeof CURRENCIES[number][];
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  search: string; setSearch: (s: string) => void;
  tab: 'popular' | 'all'; setTab: (t: 'popular' | 'all') => void;
}) {
  const sel = CURRENCIES.find(x => x.code === currency)!;
  return (
    <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">What currency do you want to hold?</div>
        <p className="text-xs text-slate-500 mt-1">Each wallet holds one currency. You can move between wallets at any time via Exchange.</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Icon.Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search by code, name, or region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
            />
          </div>
          <div className="inline-flex h-9 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
            {(['popular', 'all'] as const).map(k => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 h-full rounded-md font-medium transition-colors cursor-pointer capitalize ${tab === k ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
                {k === 'popular' ? 'Popular' : 'All currencies'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {currencies.map(c => (
            <button key={c.code} onClick={() => setCurrency(c.code as CurrencyCode)}
              className={`text-left border rounded-xl p-3 transition-all cursor-pointer ${currency === c.code ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center text-xl">{c.flag}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-slate-900">{c.code}</span>
                    {c.popular && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">Popular</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{c.name}</div>
                </div>
                {currency === c.code && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 grid place-items-center shrink-0 shadow-sm">
                    <CheckIcon />
                  </div>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">1 USD =</span>
                <span className="font-mono text-slate-800 font-medium num">
                  {c.code === 'USD' ? '1.0000' : c.fx.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} <span className="text-slate-400">{c.code}</span>
                </span>
              </div>
            </button>
          ))}
          {currencies.length === 0 && (
            <div className="col-span-2 text-center py-12 text-sm text-slate-500">
              No currencies match "<span className="text-slate-700 font-medium">{search}</span>".{' '}
              <button onClick={() => setSearch('')} className="text-indigo-600 hover:text-indigo-800">Clear search</button>
            </div>
          )}
        </div>
      </div>

      <aside className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-fit">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Selected currency</div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 grid place-items-center text-2xl">{sel.flag}</div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight font-mono text-slate-900">{sel.code}</div>
            <div className="text-xs text-slate-500 truncate">{sel.name}</div>
          </div>
        </div>
        <dl className="mt-4 divide-y divide-slate-200 text-xs">
          {[
            ['Region', sel.region],
            ['Custodian', sel.custodian],
            ['FX rate', `1 USD = ${sel.code === 'USD' ? '1.0000' : sel.fx.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${sel.code}`],
            ['Fees', 'No monthly fee'],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-2 gap-2">
              <dt className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold shrink-0">{label}</dt>
              <dd className={`text-right truncate ${label === 'Fees' ? 'text-emerald-700 font-medium' : 'text-slate-800'}`}>{val}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}

/* ─── Step 1: Customize ─── */
function Step1Customize({ currency, nickname, setNickname, tag, setTag, accent, setAccent, primary, setPrimary }: {
  currency: CurrencyCode; nickname: string; setNickname: (s: string) => void;
  tag: string; setTag: (t: string) => void;
  accent: Accent; setAccent: (a: Accent) => void;
  primary: boolean; setPrimary: (b: boolean) => void;
}) {
  const c = CURRENCIES.find(x => x.code === currency)!;
  return (
    <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-5 min-w-0">
        <div>
          <div className="text-sm font-semibold text-slate-900">Set up your <span className="font-mono text-indigo-700">{c.code}</span> wallet</div>
          <p className="text-xs text-slate-500 mt-1">A nickname and tag make it easy to recognize. You can change these later.</p>
        </div>

        {/* Nickname */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Nickname</label>
            <span className="text-[11px] text-slate-400 num">{nickname.length}/32</span>
          </div>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value.slice(0, 32))}
            placeholder="e.g. Travel Spending, Rent Pot"
            className="h-10 w-full px-3 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[11px] text-slate-500">Suggestions:</span>
            {[`${c.code} Main`, `${c.code} Savings`, 'Travel Spending', 'Family'].map(s => (
              <button key={s} type="button" onClick={() => setNickname(s)}
                className="h-6 px-2 text-[11px] rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 cursor-pointer transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tag */}
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">Tag</label>
          <div className="grid grid-cols-5 gap-2">
            {TAGS.map(t => (
              <button key={t} type="button" onClick={() => setTag(t)}
                className={`border rounded-lg p-2 transition-all cursor-pointer ${tag === t ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/40' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                <div className={`text-[11px] font-medium mt-1 ${tag === t ? 'text-indigo-700' : 'text-slate-700'}`}>{t}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">Accent color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_COLORS.map(a => (
              <button key={a} type="button" onClick={() => setAccent(a)} aria-label={a}
                className={`w-7 h-7 rounded-full ${ACCENT_BG[a]} ring-offset-2 transition-all cursor-pointer ${accent === a ? `ring-2 ${ACCENT_RING[a]}` : 'ring-0 hover:scale-110'}`} />
            ))}
            <span className="text-[11px] text-slate-500 ml-1 capitalize">· {accent}</span>
          </div>
        </div>

        {/* Primary toggle */}
        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative shrink-0 mt-0.5">
              <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-200 peer-checked:bg-indigo-600 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Make this my primary wallet</div>
              <div className="text-xs text-slate-500 mt-0.5">Primary wallet is used as the default for Send, Top Up, and card transactions.</div>
            </div>
          </label>
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-0 self-start">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          Live preview
        </div>
        <WalletPreview currency={currency} nickname={nickname} tag={tag} accent={accent} primary={primary} />
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-snug">
          Preview updates as you type. Wallet ID is generated when you create.
        </div>
      </aside>
    </div>
  );
}

/* ─── Step 2: Review ─── */
function Step2Review({ currency, nickname, tag, accent, primary, agreed, setAgreed }: {
  currency: CurrencyCode; nickname: string; tag: string; accent: Accent; primary: boolean;
  agreed: boolean; setAgreed: (b: boolean) => void;
}) {
  const c = CURRENCIES.find(x => x.code === currency)!;
  return (
    <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-4 min-w-0">
        <div>
          <div className="text-sm font-semibold text-slate-900">Review &amp; create</div>
          <p className="text-xs text-slate-500 mt-1">Double-check the details. After you create, your wallet is ready to receive funds immediately.</p>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 grid place-items-center text-xl">{c.flag}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">{nickname}</div>
              <div className="text-xs text-slate-500"><span className="font-mono">{c.code}</span> · {c.name} · {tag}</div>
            </div>
            {primary && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">★ PRIMARY</span>
            )}
          </div>
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              ['Currency', <><span className="font-mono font-medium">{c.code}</span> <span className="text-slate-500 text-xs">· {c.name}</span></>],
              ['Nickname', nickname],
              ['Tag', <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{tag}</span>],
              ['Accent', <span className="inline-flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${ACCENT_BG[accent]}`} /><span className="capitalize text-slate-700">{accent}</span></span>],
              ['Custodian', c.custodian],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex items-start justify-between px-4 py-2.5 gap-3">
                <dt className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold pt-0.5 shrink-0 w-24">{label}</dt>
                <dd className="text-right min-w-0 text-slate-800 text-sm">{val}</dd>
              </div>
            ))}
          </dl>
        </div>

        <label className="flex items-start gap-2.5 p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 transition-colors cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0" />
          <span className="text-[13px] text-slate-700 leading-snug">
            I agree to MyWallet's <span className="text-indigo-700 font-medium">Wallet Terms</span> and {c.code} {c.code === 'USD' ? 'Custody' : 'cross-border'} Disclosures.
            I understand that holding {c.code} carries FX risk against my reporting currency.
          </span>
        </label>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-0 self-start">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Wallet to be created</div>
        <WalletPreview currency={currency} nickname={nickname} tag={tag} accent={accent} primary={primary} />
      </aside>
    </div>
  );
}

/* ─── Step 3: Success ─── */
function Step3Success({ currency, nickname, tag, walletId }: {
  currency: CurrencyCode; nickname: string; tag: string; walletId: string;
}) {
  const c = CURRENCIES.find(x => x.code === currency)!;
  return (
    <div className="px-6 py-10">
      <div className="max-w-md mx-auto text-center">
        <div className="flex justify-center mb-5">
          <div className="relative w-16 h-16">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
            <div className="absolute inset-0 rounded-full bg-emerald-600 grid place-items-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className="text-xl font-bold tracking-tight text-slate-900">Wallet created</div>
        <div className="text-sm text-slate-500 mt-1.5">Your <span className="font-mono text-slate-800">{c.code}</span> wallet is active and ready to use.</div>

        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200 text-left">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 grid place-items-center text-xl">{c.flag}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{nickname}</div>
              <div className="text-xs text-slate-500"><span className="font-mono">{c.code}</span> · {tag}</div>
            </div>
          </div>
          {[['Wallet ID', <span className="font-mono text-xs text-slate-800">{walletId}</span>],
            ['Status', <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />ACTIVE</span>],
            ['Created', <span className="text-xs text-slate-700 num">{new Date().toISOString().slice(0, 10)}</span>],
          ].map(([label, val]) => (
            <div key={String(label)} className="flex items-center justify-between px-4 py-2.5 gap-2">
              <dt className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">{label}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main modal ─── */
interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddWalletModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const createWallet = useCreateWallet();

  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // form state
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'popular' | 'all'>('popular');
  const [nickname, setNickname] = useState('');
  const [tag, setTag] = useState('Personal');
  const [accent, setAccent] = useState<Accent>('indigo');
  const [primary, setPrimary] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const filteredCurrencies = useMemo(() => CURRENCIES.filter(x => {
    if (tab === 'popular' && !x.popular) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q) || x.region.toLowerCase().includes(q);
  }), [tab, search]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  const reset = useCallback(() => {
    setStep(0);
    setCurrency('USD'); setSearch(''); setTab('popular');
    setNickname(''); setTag('Personal'); setAccent('indigo');
    setPrimary(false); setAgreed(false); setCreatedId(null);
  }, []);

  const requestClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => { setExiting(false); onClose(); reset(); }, 160);
  }, [onClose, reset]);

  const handleCreate = async () => {
    if (!user) return;
    try {
      const result = await createWallet.mutateAsync({
        userId: user.id,
        currency,
        externalId: `${nickname.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      });
      setCreatedId(result.id);
      setStep(3);
    } catch {
      // error handled by mutation state
    }
  };

  if (!open) return null;

  const labels = ['Choose currency', 'Customize', 'Review'];
  const creating = createWallet.isPending;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${exiting ? '' : 'animate-in fade-in'}`}
      style={{ animation: exiting ? 'none' : undefined }}>
      <div onClick={requestClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <div className={`relative w-[min(960px,calc(100%-32px))] max-h-[calc(100vh-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden`}
        style={{ animation: exiting ? 'dialogOut 160ms ease-in both' : 'dialogIn 240ms cubic-bezier(.2,.7,.2,1) both' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 grid place-items-center text-white shadow-sm">
                <Icon.Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">Add a new wallet</div>
                <div className="text-xs text-slate-500 mt-0.5">Hold balances in another currency · {step < 3 ? `step ${step + 1} of 3` : 'completed'}</div>
              </div>
            </div>
            <button onClick={requestClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          {step < 3 && (
            <div className="mt-5">
              <StepRail step={step} labels={labels} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto">
          {step === 0 && (
            <Step0Currency
              currencies={filteredCurrencies as typeof CURRENCIES[number][]}
              currency={currency} setCurrency={setCurrency}
              search={search} setSearch={setSearch}
              tab={tab} setTab={setTab}
            />
          )}
          {step === 1 && (
            <Step1Customize
              currency={currency} nickname={nickname} setNickname={setNickname}
              tag={tag} setTag={setTag} accent={accent} setAccent={setAccent}
              primary={primary} setPrimary={setPrimary}
            />
          )}
          {step === 2 && (
            <Step2Review
              currency={currency} nickname={nickname} tag={tag} accent={accent}
              primary={primary} agreed={agreed} setAgreed={setAgreed}
            />
          )}
          {step === 3 && createdId && (
            <Step3Success currency={currency} nickname={nickname} tag={tag} walletId={createdId} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2 min-w-0">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2l5 2v4c0 3-2.5 5-5 6-2.5-1-5-3-5-6V4l5-2z" />
            </svg>
            <span className="truncate">Funds custodied by partner banks · FDIC insured up to $250,000</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {step === 0 && (
              <>
                <Btn variant="ghost" size="lg" onClick={requestClose}>Cancel</Btn>
                <Btn variant="primary" size="lg" onClick={() => setStep(1)} disabled={!currency}>
                  Continue
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                </Btn>
              </>
            )}
            {step === 1 && (
              <>
                <Btn variant="outline" size="lg" onClick={() => setStep(0)}>
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M13 8H3M7 4L3 8l4 4" /></svg>
                  Back
                </Btn>
                <Btn variant="primary" size="lg" onClick={() => setStep(2)} disabled={!nickname.trim()}>
                  Continue
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                </Btn>
              </>
            )}
            {step === 2 && (
              <>
                <Btn variant="outline" size="lg" onClick={() => setStep(1)} disabled={creating}>
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M13 8H3M7 4L3 8l4 4" /></svg>
                  Back
                </Btn>
                <Btn variant="primary" size="lg" onClick={handleCreate} disabled={!agreed || creating}>
                  {creating ? <><Spinner />Creating…</> : <>Create wallet <CheckIcon /></>}
                </Btn>
              </>
            )}
            {step === 3 && (
              <>
                <Btn variant="outline" size="lg" onClick={() => reset()}>Add another</Btn>
                <Btn variant="primary" size="lg" onClick={requestClose}>
                  View wallet
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                </Btn>
              </>
            )}
          </div>
        </div>

        <style>{`
          @keyframes dialogIn  { from { opacity:0; transform:translateY(8px) scale(0.985); } to { opacity:1; transform:none; } }
          @keyframes dialogOut { from { opacity:1; } to { opacity:0; transform:translateY(6px) scale(0.99); } }
        `}</style>
      </div>
    </div>
  );
}
