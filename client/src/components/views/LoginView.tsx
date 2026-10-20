import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, User, Sparkles, Building2, UserCheck, ShoppingBag, Truck } from 'lucide-react';
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
      setError(res.error || 'Authentication failed. Please verify credentials.');
      setIsSubmitting(false);
    }
  };

  const setDemoRole = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="relative min-h-screen bg-navy-950 flex items-center justify-center p-4 sm:p-6 text-slate-100 overflow-hidden">
      {/* Ambient Luxury Lighting Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-7 relative z-10">
        {/* Brand Crest & Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-b from-navy-800 to-navy-950 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] mb-1 group">
            {/* Emerald Gem Core */}
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center transform group-hover:rotate-6 transition-transform">
              <span className="font-mono text-base font-black text-emerald-300 tracking-wider">SV</span>
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              SUPPLY<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300">VAULT</span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase mt-1">
              Computer Hardware & Laptop Enterprise Supply Chain
            </p>
          </div>
        </div>

        {/* Glass Authentication Card */}
        <div className="bg-navy-900/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.06)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Secure Portal Access
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Authenticate with encrypted role credentials</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Gateway
            </span>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 tracking-wide">
                User Identity / Work Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-navy-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 tracking-wide">
                Account Security Key
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter security key"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-navy-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 btn-luxury-emerald rounded-xl flex items-center justify-center gap-2 text-xs tracking-wide uppercase transition-all disabled:opacity-50 mt-2 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Enterprise Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Grid */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                One-Click Viva Demo Role Fast-Select
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Manager */}
              <button
                type="button"
                onClick={() => setDemoRole('manager', 'manager123')}
                className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2.5 ${
                  username === 'manager'
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'bg-navy-950/60 border-slate-800/80 hover:border-emerald-500/40 hover:bg-navy-950'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Manager</div>
                  <div className="text-[10px] font-mono text-emerald-400/80">manager123</div>
                </div>
              </button>

              {/* Staff */}
              <button
                type="button"
                onClick={() => setDemoRole('staff', 'staff123')}
                className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2.5 ${
                  username === 'staff'
                    ? 'bg-sky-950/40 border-sky-500/60 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-500/40'
                    : 'bg-navy-950/60 border-slate-800/80 hover:border-sky-500/40 hover:bg-navy-950'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Staff</div>
                  <div className="text-[10px] font-mono text-sky-400/80">staff123</div>
                </div>
              </button>

              {/* Buyer */}
              <button
                type="button"
                onClick={() => setDemoRole('buyer', 'buyer123')}
                className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2.5 ${
                  username === 'buyer'
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40'
                    : 'bg-navy-950/60 border-slate-800/80 hover:border-purple-500/40 hover:bg-navy-950'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Buyer</div>
                  <div className="text-[10px] font-mono text-purple-400/80">buyer123</div>
                </div>
              </button>

              {/* Delivery Agent */}
              <button
                type="button"
                onClick={() => setDemoRole('agent', 'agent123')}
                className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2.5 ${
                  username === 'agent'
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
                    : 'bg-navy-950/60 border-slate-800/80 hover:border-amber-500/40 hover:bg-navy-950'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Logistics Agent</div>
                  <div className="text-[10px] font-mono text-amber-400/80">agent123</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Cryptography Verification Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[10px] font-mono text-slate-500 tracking-wider">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>BCRYPT AUTH • POSTGRESQL ACID • ENCRYPTED SESSION TOKENS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
