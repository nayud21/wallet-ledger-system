import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useTransfer } from '../../hooks/useWallets';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import { fmtMoney } from '../../utils/format';
import { fetchWallet } from '../../api/wallets';
import type { WalletResponse } from '../../types/api';

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
const WarnIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-500">
    <path d="M8 2l6 11H2L8 2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11.2" r=".5" fill="currentColor" stroke="none"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-indigo-600">
    <path d="M3 8.5l3.5 3.5L13 4.5"/>
  </svg>
);
const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400">
    <path d="M4 6l4 4 4-4"/>
  </svg>
);

const STEPS = ['Recipient', 'Amount', 'Confirm'];

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2].map(i => (
        <span key={i} className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          {i < 2 && <span className={`h-px w-8 ${i < step ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
        </span>
      ))}
    </div>
  );
}

function SummaryRow({ label, children, emphasize }: { label: string; children: React.ReactNode; emphasize?: boolean }) {
  return (
    <div className={`flex items-start justify-between px-4 py-3 ${emphasize ? 'bg-slate-50' : ''}`}>
      <dt className="text-xs uppercase tracking-wide text-slate-500 font-medium pt-0.5">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default function SendPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallets } = useWallets(user!.id);
  const transfer = useTransfer();

  const [step, setStep] = useState(0);
  const [toWalletId, setToWalletId] = useState('');
  const [toWallet, setToWallet] = useState<WalletResponse | null>(null);
  const [recipientError, setRecipientError] = useState('');
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [fromWalletId, setFromWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');

  const fromWallet: WalletResponse | undefined =
    wallets?.find(w => w.id === fromWalletId) ?? wallets?.[0];

  const amountNum = parseFloat(amount) || 0;
  const insufficient = !!fromWallet && amountNum > fromWallet.availableBalance;

  async function handleContinueStep0() {
    const trimmed = toWalletId.trim();
    if (!trimmed) return;
    setRecipientLoading(true);
    setRecipientError('');
    try {
      const wallet = await fetchWallet(trimmed);
      setToWallet(wallet);
      setStep(1);
    } catch {
      setRecipientError('Wallet not found. Check the ID and try again.');
    } finally {
      setRecipientLoading(false);
    }
  }

  async function handleConfirm() {
    if (!fromWallet) return;
    setError('');
    try {
      await transfer.mutateAsync({
        fromWalletId: fromWallet.id,
        toWalletId,
        amount: amountNum,
        currency: fromWallet.currency,
        idempotencyKey: crypto.randomUUID(),
      });
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transfer failed.');
    }
  }

  return (
    <ConsumerLayout>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
            Step {step + 1} of 3
          </div>
          <div className="text-xl font-semibold tracking-tight mt-1">{STEPS[step]}</div>
        </div>
        <StepDots step={step} />

        <div className="bg-white border border-slate-200 rounded-xl p-5">

          {/* Step 0 — Recipient */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Wallet ID</label>
                  <span className="text-[11px] text-slate-400">who you're sending to</span>
                </div>
                <input
                  type="text"
                  value={toWalletId}
                  onChange={e => { setToWalletId(e.target.value); setRecipientError(''); }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`h-10 w-full px-3 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 placeholder:text-slate-400 ${
                    recipientError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
                {recipientError && (
                  <div className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1">
                    <WarnIcon />
                    <span>{recipientError}</span>
                  </div>
                )}
              </div>
              <button
                disabled={!toWalletId.trim() || recipientLoading}
                onClick={handleContinueStep0}
                className="h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-lg text-[15px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                {recipientLoading ? 'Checking…' : <> Continue <ArrowRight /> </>}
              </button>
            </div>
          )}

          {/* Step 1 — Amount */}
          {step === 1 && (
            <div className="space-y-4">
              {/* From wallet selector */}
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">From wallet</label>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg flex items-center text-left hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{fromWallet?.currency} Wallet</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{fromWallet?.id}</div>
                    </div>
                    <div className="text-sm text-slate-700 mr-2">
                      {fromWallet ? fmtMoney(fromWallet.availableBalance, fromWallet.currency) : '—'}
                    </div>
                    <ChevronIcon />
                  </button>
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-12 bg-white border border-slate-200 rounded-lg z-20 py-1 shadow-sm">
                        {wallets?.map(w => (
                          <button
                            key={w.id}
                            onClick={() => { setFromWalletId(w.id); setDropdownOpen(false); }}
                            className="w-full px-3 py-2 flex items-center hover:bg-slate-50 text-left gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800">{w.currency} Wallet</div>
                              <div className="text-[11px] text-slate-500 font-mono truncate">{w.id}</div>
                            </div>
                            <div className="text-sm text-slate-700">{fmtMoney(w.availableBalance, w.currency)}</div>
                            {fromWallet?.id === w.id && <CheckIcon />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Amount</label>
                  {insufficient && (
                    <span className="text-[11px] text-rose-600">Insufficient balance</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={`h-12 w-full px-3 pr-16 text-xl font-semibold bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                      insufficient
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-700'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 text-slate-900'
                    }`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 font-mono">
                    {fromWallet?.currency ?? 'USD'}
                  </div>
                </div>
                {fromWallet && (
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-500">
                      Available <span className="text-slate-700 font-medium">{fmtMoney(fromWallet.availableBalance, fromWallet.currency)}</span>
                    </span>
                    <div className="flex gap-1">
                      {[25, 50, 100].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAmount((fromWallet.availableBalance * p / 100).toFixed(2))}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                        >
                          {p}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAmount(fromWallet.availableBalance.toFixed(2))}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setStep(0)} className="h-11 inline-flex items-center justify-center gap-1.5 rounded-lg text-[15px] font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
                  <ArrowLeft />Back
                </button>
                <button
                  disabled={insufficient || amountNum <= 0}
                  onClick={() => setStep(2)}
                  className="h-11 inline-flex items-center justify-center gap-1.5 rounded-lg text-[15px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Confirm */}
          {step === 2 && fromWallet && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">You're sending</div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-900 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoney(amountNum, fromWallet.currency)}{' '}
                    <span className="text-sm text-slate-500 font-medium font-mono">{fromWallet.currency}</span>
                  </div>
                </div>
                <dl className="divide-y divide-slate-100 text-sm">
                  <SummaryRow label="From">
                    <div className="text-right">
                      <div className="text-slate-800 font-medium">{fromWallet.currency} Wallet</div>
                      <div className="text-[11px] text-slate-500 font-mono">{fromWallet.id}</div>
                    </div>
                  </SummaryRow>
                  <SummaryRow label="To">
                    <div className="text-right">
                      {toWallet && <div className="text-slate-800 font-medium">{toWallet.currency} Wallet</div>}
                      <div className="text-[11px] text-slate-500 font-mono">{toWalletId}</div>
                    </div>
                  </SummaryRow>
                  <SummaryRow label="Amount">
                    <span className="font-medium text-slate-900">{fmtMoney(amountNum, fromWallet.currency)}</span>
                  </SummaryRow>
                  <SummaryRow label="Fee">
                    <span className="text-slate-500">{fmtMoney(0, fromWallet.currency)}</span>
                  </SummaryRow>
                  <SummaryRow label="Total deducted" emphasize>
                    <span className="font-semibold text-slate-900">{fmtMoney(amountNum, fromWallet.currency)}</span>
                  </SummaryRow>
                </dl>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setStep(1)} className="h-11 inline-flex items-center justify-center gap-1.5 rounded-lg text-[15px] font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
                  <ArrowLeft />Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={transfer.isPending}
                  className="h-11 inline-flex items-center justify-center gap-1.5 rounded-lg text-[15px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed transition-colors"
                >
                  {transfer.isPending ? 'Sending…' : 'Confirm & Send'}
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <WarnIcon />
                This action cannot be undone.
              </div>
            </div>
          )}
        </div>
      </div>
    </ConsumerLayout>
  );
}
