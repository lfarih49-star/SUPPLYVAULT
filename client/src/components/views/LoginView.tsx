import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, User, IndianRupee, Truck, Boxes } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('manager');
  const [password, setPassword] = useState('manager123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const res = await login(username, password);
    if (!res.success) {
      setError(res.error || 'Authentication failed.');
      setIsSubmitting(false);
    }
  };

  const setDemoRole = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 flex items-center justify-center p-4 sm:p-6 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Crest */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-emerald-500/30 shadow-2xl mb-1">
            <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider">SV</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
            Supply<span className="text-emerald-400">Vault</span>
          </h1>
          <p className="text-xs text-slate-400 tracking-wider uppercase font-semibold">
            Enterprise Computer Hardware & Laptop Supply Chain Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-navy-900/90 border border-navy-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Portal Authentication</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sign in to access your authorized role workspace.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Username or Work Email</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Account Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Enter Secure Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="pt-4 border-t border-navy-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              1-Click Viva Demo Role Fast-Select
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('manager', 'manager123')}
                className="p-2 rounded-lg bg-navy-950/80 hover:bg-navy-800 border border-slate-800 hover:border-emerald-500/40 text-slate-200 font-semibold flex flex-col items-center justify-center transition-colors"
              >
                <span>Manager</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">manager123</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('staff', 'staff123')}
                className="p-2 rounded-lg bg-navy-950/80 hover:bg-navy-800 border border-slate-800 hover:border-sky-500/40 text-slate-200 font-semibold flex flex-col items-center justify-center transition-colors"
              >
                <span>Staff</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">staff123</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('buyer', 'buyer123')}
                className="p-2 rounded-lg bg-navy-950/80 hover:bg-navy-800 border border-slate-800 hover:border-purple-500/40 text-slate-200 font-semibold flex flex-col items-center justify-center transition-colors"
              >
                <span>Buyer</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">buyer123</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('agent', 'agent123')}
                className="p-2 rounded-lg bg-navy-950/80 hover:bg-navy-800 border border-slate-800 hover:border-amber-500/40 text-slate-200 font-semibold flex flex-col items-center justify-center transition-colors"
              >
                <span>Delivery Agent</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">agent123</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>BCrypt Encryption • Role-Authorized Session Tokens • PostgreSQL ACID</span>
        </div>
      </div>
    </div>
  );
};

