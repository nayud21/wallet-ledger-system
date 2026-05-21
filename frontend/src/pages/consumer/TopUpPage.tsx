import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useTopUp } from '../../hooks/useWallets';
import { useToast } from '../../context/ToastContext';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import type { WalletResponse } from '../../types/api';
import { fmtMoney } from '../../utils/format';

/* ── Icons ─────────────────────────────────────────────── */
const ArrowLeft = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M13 8H3M7 4L3 8l4 4"/>
  </svg>
);
const ArrowRight = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 8h10M9 4l4 4-4 4"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
    <path d="M3 8.5l3.5 3.5L13 4.5"/>
  </svg>
);
const WarnIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 shrink-0">
    <path d="M8 2l6 11H2L8 2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11.2" r=".5" fill="currentColor" stroke="none"/>
  </svg>
);
const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const PRESETS: Record<string, number[]> = {
  USD: [50, 100, 250, 500],
  VND: [500000, 1000000, 2500000, 5000000],
  EUR: [50, 100, 250, 500],
  GBP: [50, 100, 250, 500],
};

function formatPreset(v: number, currency: string) {
  if (currency === 'VND') return v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1000}k`;
  return fmtMoney(v, currency);
}

const currencyColor = (c: string) =>
  c === 'USD' ? 'bg-indigo-100 text-indigo-700'
  : c === 'VND' ? 'bg-emerald-100 text-emerald-700'
  : 'bg-slate-100 text-slate-700';

/* ── StepDots ───────────────────────────────────────────── */
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center gap-2">
          <span className={`rounded-full transition-all ${i <= step ? (i === 2 && step >= 2 ? 'bg-emerald-600' : 'bg-indigo-600') : 'bg-slate-200'} ${i === step ? 'w-3 h-3' : 'w-2.5 h-2.5'}`}/>
          {i < 2 && <span className={`h-px w-8 transition-colors ${i < step ? 'bg-indigo-600' : 'bg-slate-200'}`}/>}
        </span>
      ))}
    </div>
  );
}

/* ── SumRow ─────────────────────────────────────────────── */
function SumRow({ label, children, emphasize }: { label: string; children: React.ReactNode; emphasize?: boolean }) {
  return (
    <div className={`flex items-start justify-between px-5 py-3 ${emphasize ? 'bg-slate-50' : ''}`}>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500 font-medium pt-0.5">{label}</dt>
      <dd className="text-sm text-right min-w-0">{children}</dd>
    </div>
  );
}

/* ── Step 0 — Select wallet ─────────────────────────────── */
function Step0({ wallets, selectedId, onSelect, onContinue }: {
  wallets: WalletResponse[];
  selectedId: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="fade-up-step">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Choose a wallet to top up</div>
        <div className="space-y-2">
          {wallets.map((w) => {
            const active = selectedId === w.id;
            const frozen = w.status === 'FROZEN';
            return (
              <button
                key={w.id}
                disabled={frozen}
                onClick={() => onSelect(w.id)}
                className={`w-full text-left border rounded-xl px-3.5 py-3 flex items-center gap-3 transition-colors ${active ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/40' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'} ${frozen ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg grid place-items-center font-mono text-[11px] font-semibold shrink-0 ${currencyColor(w.currency)}`}>
                  {w.currency}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{w.currency} Wallet</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${frozen ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${frozen ? 'bg-slate-400' : 'bg-emerald-500'}`}/>
                      {w.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{w.id}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(w.availableBalance, w.currency)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">Available</div>
                </div>
                <div className={`w-4 h-4 rounded-full border ml-1 shrink-0 grid place-items-center ${active ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                  {active && <CheckIcon />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          {selectedId && wallets.find(w => w.id === selectedId)?.status === 'FROZEN' && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
              This wallet is frozen. Unfreeze it before topping up.
            </div>
          )}
          <button
            disabled={!selectedId || wallets.find(w => w.id === selectedId)?.status === 'FROZEN'}
            onClick={onContinue}
            className="h-11 w-full px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed transition-colors"
          >
            Continue <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1 — Amount + external ref ─────────────────────── */
function Step1({ wallet, amount, setAmount, externalRef, setExternalRef, onBack, onContinue }: {
  wallet: WalletResponse;
  amount: string;
  setAmount: (v: string) => void;
  externalRef: string;
  setExternalRef: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const amountNum = parseFloat(amount) || 0;
  const presets = PRESETS[wallet.currency] ?? PRESETS.USD;
  const dec = (amount.split('.')[1] || '').length;

  const error =
    amount.startsWith('-') ? 'Amount must be positive.' :
    dec > 2 ? 'Use at most 2 decimal places.' :
    amountNum > 1_000_000 ? `Maximum single top-up is ${fmtMoney(1_000_000, wallet.currency)}.` :
    null;

  const canContinue = amountNum > 0 && !error;

  return (
    <div className="fade-up-step space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">

        {/* Wallet context */}
        <div>
          <label className="text-xs font-medium text-slate-700 mb-1.5 block">Wallet</label>
          <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <div className={`w-6 h-6 rounded grid place-items-center font-mono text-[10px] font-semibold ${currencyColor(wallet.currency)}`}>{wallet.currency}</div>
            <div className="flex-1 text-sm font-medium text-slate-800">{wallet.currency} Wallet</div>
            <div className="text-xs text-slate-500 shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(wallet.availableBalance, wallet.currency)} avail.</div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-700">Amount</label>
            <span className="text-[11px] text-slate-400">positive · up to 2 decimal places</span>
          </div>
          <div className="relative">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                let v = e.target.value.replace(/[^\d.]/g, '');
                const parts = v.split('.');
                if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                setAmount(v);
              }}
              placeholder="0.00"
              className={`h-14 w-full pl-3 pr-20 text-2xl font-semibold bg-white border rounded-lg focus:ring-2 focus:outline-none ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-700' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 text-slate-900'}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-xs font-medium font-mono tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{wallet.currency}</span>
            </div>
          </div>
          {error && (
            <div className="text-[12px] text-rose-600 mt-1.5 flex items-start gap-1"><WarnIcon /><span>{error}</span></div>
          )}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {presets.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={`h-8 rounded-md border text-xs font-medium transition-colors ${parseFloat(amount) === v ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatPreset(v, wallet.currency)}
              </button>
            ))}
          </div>
        </div>

        {/* External ref */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-700">External reference <span className="text-slate-400 font-normal ml-1">(optional)</span></label>
          </div>
          <input
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            placeholder="e.g. stripe_pi_3OAB29Hk or BANK-2026-05-21-7714"
            maxLength={64}
            className="h-10 w-full px-3 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none placeholder:text-slate-400 font-mono text-[12.5px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack} className="h-11 px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors">
          <ArrowLeft />Back
        </button>
        <button disabled={!canContinue} onClick={onContinue} className="h-11 px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed transition-colors">
          Review <ArrowRight />
        </button>
      </div>
    </div>
  );
}

/* ── Step 2 — Confirm ───────────────────────────────────── */
function Step2({ wallet, amount, externalRef, submitting, lastError, onBack, onConfirm }: {
  wallet: WalletResponse;
  amount: string;
  externalRef: string;
  submitting: boolean;
  lastError: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const amountNum = parseFloat(amount) || 0;

  return (
    <div className="fade-up-step space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-indigo-50/50 to-transparent">
          <div className="text-[11px] uppercase tracking-wider text-indigo-700/80 font-medium">You're topping up</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(amountNum, wallet.currency)}</span>
            <span className="text-sm font-medium text-slate-500 font-mono">{wallet.currency}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">into <span className="text-slate-900 font-medium">{wallet.currency} Wallet</span></div>
        </div>

        <dl className="divide-y divide-slate-100 text-sm">
          <SumRow label="Wallet">
            <div className="text-right">
              <div className="text-slate-800 font-medium">{wallet.currency} Wallet</div>
              <div className="text-[11px] text-slate-500 font-mono">{wallet.id}</div>
            </div>
          </SumRow>
          <SumRow label="Amount">
            <span className="font-medium text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(amountNum, wallet.currency)}</span>
          </SumRow>
          <SumRow label="Fee">
            <span className="text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(0, wallet.currency)}</span>
          </SumRow>
          {externalRef && (
            <SumRow label="External ref">
              <span className="font-mono text-[12px] text-slate-700 break-all text-right max-w-[200px]">{externalRef}</span>
            </SumRow>
          )}
          <SumRow label="New balance" emphasize>
            <span className="font-semibold text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(wallet.availableBalance + amountNum, wallet.currency)}</span>
          </SumRow>
        </dl>
      </div>

      {lastError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 flex items-start gap-2 fade-up-step">
          <WarnIcon />
          <div className="flex-1">
            <div className="font-medium">Top-up failed</div>
            <div className="text-[12px] text-rose-600/90 mt-0.5">{lastError}</div>
          </div>
          <button onClick={onConfirm} className="text-[12px] font-medium text-rose-700 hover:text-rose-900 underline-offset-2 hover:underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack} disabled={submitting} className="h-11 px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <ArrowLeft />Back
        </button>
        <button onClick={onConfirm} disabled={submitting} className="h-11 px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed transition-colors">
          {submitting ? <><Spinner />Processing…</> : <>Confirm Top Up <ArrowRight /></>}
        </button>
      </div>
    </div>
  );
}

/* ── Success screen ─────────────────────────────────────── */
function SuccessScreen({ wallet, amount, externalRef, idempotencyKey, onTopUpAgain, onDashboard }: {
  wallet: WalletResponse;
  amount: string;
  externalRef: string;
  idempotencyKey: string;
  onTopUpAgain: () => void;
  onDashboard: () => void;
}) {
  const amountNum = parseFloat(amount) || 0;
  return (
    <div className="space-y-4 fade-up-step">
      <div className="bg-white border border-slate-200 rounded-xl p-7">
        <div className="flex justify-center mb-5">
          <div className="relative w-16 h-16">
            <span className="absolute inset-0 rounded-full bg-emerald-500 success-ring" />
            <div className="success-circle absolute inset-0 rounded-full bg-emerald-600 grid place-items-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path className="success-check" d="M5 12.5l4.5 4.5L19 7.5"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="text-center mb-6 fade-up-1">
          <div className="text-xl font-semibold tracking-tight text-slate-900">Top-up Successful</div>
          <div className="text-sm text-slate-500 mt-1.5">Funds are now available in your wallet.</div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200 fade-up-2">
          <SumRow label="Wallet">
            <div className="text-right">
              <div className="text-slate-800 font-medium">{wallet.currency} Wallet</div>
              <div className="text-[11px] text-slate-500 font-mono">{wallet.id}</div>
            </div>
          </SumRow>
          <SumRow label="Amount">
            <span className="text-base font-bold text-emerald-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
              +{fmtMoney(amountNum, wallet.currency)} <span className="text-xs text-emerald-600/80 font-medium font-mono">{wallet.currency}</span>
            </span>
          </SumRow>
          <SumRow label="Reference">
            <span className="font-mono text-[12px] text-slate-700 break-all text-right max-w-[220px]">{externalRef || '—'}</span>
          </SumRow>
          <SumRow label="Transaction">
            <span className="font-mono text-[12px] text-slate-700">tx_{idempotencyKey.slice(0, 8)}</span>
          </SumRow>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6 fade-up-3">
          <button onClick={onTopUpAgain} className="h-11 px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors">
            Top Up Again
          </button>
          <button onClick={onDashboard} className="h-11 px-5 text-[15px] inline-flex items-center justify-center gap-1.5 rounded-lg font-medium bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TopUpPage ──────────────────────────────────────────── */
export default function TopUpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const { data: wallets, isLoading } = useWallets(user!.id);
  const topUp = useTopUp();

  const preselectedId = searchParams.get('walletId') ?? '';
  const [step, setStep] = useState(0);
  const [walletId, setWalletId] = useState(preselectedId);
  const [amount, setAmount] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(crypto.randomUUID());
  const [lastError, setLastError] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<{ wallet: WalletResponse; amount: string; externalRef: string; idempotencyKey: string } | null>(null);

  // Auto-select once wallets load: prefer preselected, else single active wallet
  useEffect(() => {
    if (!wallets) return;
    if (preselectedId && wallets.some(w => w.id === preselectedId)) {
      setWalletId(preselectedId);
      return;
    }
    const active = wallets.filter(w => w.status === 'ACTIVE');
    if (!walletId && active.length === 1) setWalletId(active[0].id);
  }, [wallets]);

  const activeWallets = wallets?.filter(w => w.status !== 'FROZEN') ?? [];
  const wallet = wallets?.find(w => w.id === walletId) ?? wallets?.[0];

  const reset = (preserveWallet = false) => {
    setStep(0);
    setAmount('');
    setExternalRef('');
    setIdempotencyKey(crypto.randomUUID());
    setLastError(null);
    setSuccessPayload(null);
    if (!preserveWallet) setWalletId(preselectedId);
  };

  const handleConfirm = () => {
    if (!wallet) return;
    setLastError(null);
    topUp.mutate(
      { walletId: wallet.id, amount: parseFloat(amount), currency: wallet.currency, idempotencyKey, externalRef: externalRef || undefined },
      {
        onSuccess: () => {
          setSuccessPayload({ wallet, amount, externalRef, idempotencyKey });
          toast.push({ kind: 'success', title: 'Top-up received', subtitle: `+${fmtMoney(parseFloat(amount), wallet.currency)} credited to ${wallet.currency} Wallet` });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Top-up failed. Please try again.';
          setLastError(msg);
          toast.push({ kind: 'error', title: 'Top-up failed', subtitle: msg });
        },
      }
    );
  };

  const stepLabels = ['Select wallet', 'Enter amount', 'Review & confirm'];

  if (successPayload) {
    return (
      <ConsumerLayout>
        <div className="max-w-md mx-auto pt-4 pb-12">
          <SuccessScreen
            wallet={successPayload.wallet}
            amount={successPayload.amount}
            externalRef={successPayload.externalRef}
            idempotencyKey={successPayload.idempotencyKey}
            onTopUpAgain={() => reset(true)}
            onDashboard={() => navigate('/dashboard')}
          />
        </div>
      </ConsumerLayout>
    );
  }

  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto pt-2 pb-12">
        {/* Page header */}
        <div className="flex items-center mb-1">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/dashboard')}
            className="-ml-2 h-8 px-2 rounded-md text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft />
            {step > 0 ? 'Previous step' : 'Cancel'}
          </button>
        </div>

        <div className="text-center mt-2 mb-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Step {step + 1} of 3</div>
          <div className="text-xl font-semibold tracking-tight mt-1">{stepLabels[step]}</div>
        </div>
        <StepDots step={step} />

        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && step === 0 && (
          <Step0
            wallets={activeWallets}
            selectedId={walletId}
            onSelect={setWalletId}
            onContinue={() => setStep(1)}
          />
        )}

        {!isLoading && step === 1 && wallet && (
          <Step1
            wallet={wallet}
            amount={amount}
            setAmount={setAmount}
            externalRef={externalRef}
            setExternalRef={setExternalRef}
            onBack={() => setStep(0)}
            onContinue={() => { setLastError(null); setStep(2); }}
          />
        )}

        {!isLoading && step === 2 && wallet && (
          <Step2
            wallet={wallet}
            amount={amount}
            externalRef={externalRef}
            submitting={topUp.isPending}
            lastError={lastError}
            onBack={() => setStep(1)}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </ConsumerLayout>
  );
}
