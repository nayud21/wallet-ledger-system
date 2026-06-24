import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest, register as registerRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const WalletLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
    <rect x="2" y="6" width="20" height="14" rx="3" fill="#4f46e5"/>
    <rect x="2" y="6" width="20" height="14" rx="3" stroke="#3730a3" strokeWidth="0.5"/>
    <rect x="15" y="11" width="6" height="4" rx="1" fill="#a5b4fc"/>
    <circle cx="18" cy="13" r="0.9" fill="#3730a3"/>
    <path d="M2 9c2-2 6-3 10-3s8 1 10 3" stroke="#6366f1" strokeWidth="0.6" fill="none"/>
  </svg>
);

const WarnIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 shrink-0">
    <path d="M8 2l6 11H2L8 2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11.2" r=".5" fill="currentColor" stroke="none"/>
  </svg>
);

const inputCls = "h-10 w-full px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = mode === 'login'
        ? (await loginRequest(usernameOrEmail.trim(), password)).accessToken
        : (await registerRequest(username.trim(), email.trim(), password)).accessToken;
      login(token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError('');
    setPassword('');
  }

  const canSubmit = mode === 'login'
    ? usernameOrEmail.trim() && password
    : username.trim() && email.trim() && password.length >= 8;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 grid place-items-center mb-3">
            <WalletLogo />
          </div>
          <div className="text-xl font-semibold tracking-tight text-slate-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            {mode === 'login' ? 'Sign in to your MyWallet account' : 'Sign up to start using MyWallet'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Username</label>
                <input type="text" value={username} autoFocus
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="yourname" className={inputCls} />
              </div>
            )}

            {mode === 'register' ? (
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Email</label>
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com" className={inputCls} />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Username or email</label>
                <input type="text" value={usernameOrEmail} autoFocus
                  onChange={e => { setUsernameOrEmail(e.target.value); setError(''); }}
                  placeholder="yourname or you@example.com" className={inputCls} />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">Password</label>
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                className={inputCls} />
            </div>

            <button type="submit" disabled={!canSubmit || loading}
              className="h-11 w-full px-5 text-[15px] inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 flex items-start gap-2">
                <WarnIcon />
                <div className="font-medium">{error}</div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-[13px] text-slate-500 mt-4">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => switchMode('register')} className="font-medium text-indigo-600 hover:text-indigo-700">Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="font-medium text-indigo-600 hover:text-indigo-700">Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
