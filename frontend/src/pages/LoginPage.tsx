import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUser } from '../api/users';
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

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    try {
      const user = await fetchUser(trimmed);
      login({ id: user.id, username: user.username, email: user.email });
      navigate('/dashboard', { replace: true });
    } catch {
      setError('User not found. Check your User ID and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 grid place-items-center mb-3">
            <WalletLogo />
          </div>
          <div className="text-xl font-semibold tracking-tight text-slate-900">Welcome back</div>
          <div className="text-sm text-slate-500 mt-0.5">Sign in to your MyWallet account</div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">User ID</label>
                <span className="text-[11px] text-slate-400">your account UUID</span>
              </div>
              <input
                type="text"
                value={userId}
                onChange={e => { setUserId(e.target.value); setError(''); }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="h-10 w-full px-3 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!userId.trim() || loading}
              className="h-11 w-full px-5 text-[15px] inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 flex items-start gap-2">
                <WarnIcon />
                <div className="font-medium">{error}</div>
              </div>
            )}
          </form>
        </div>

        {/* Mock notice */}
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Mock login — paste a user UUID from the database.
          {' '}Real auth is tracked in{' '}
          <span className="font-mono">docs/learning-notes/10_auth_future.md</span>.
        </p>
      </div>
    </div>
  );
}
