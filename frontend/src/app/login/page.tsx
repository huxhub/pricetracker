'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('user@pricetracker.com');
  const [password, setPassword] = useState('user123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white font-sans overflow-x-hidden">
      {/* 40% Left Image / Aurora Mesh Gradient Column */}
      <div
        className="w-full md:w-[40%] min-h-[360px] md:min-h-screen p-8 sm:p-12 lg:p-16 flex flex-col justify-end relative overflow-hidden select-none"
        style={{
          background: `
            radial-gradient(circle at 15% 15%, rgba(96, 165, 250, 0.95) 0%, transparent 45%),
            radial-gradient(circle at 85% 15%, rgba(192, 132, 252, 0.9) 0%, transparent 50%),
            radial-gradient(circle at 15% 65%, rgba(29, 78, 216, 0.98) 0%, transparent 55%),
            radial-gradient(circle at 85% 85%, rgba(224, 231, 255, 0.9) 0%, transparent 50%),
            linear-gradient(140deg, #1d4ed8 0%, #3730a3 50%, #6b21a8 100%)
          `,
        }}
      >
        {/* Ambient luminous glow highlights */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-400/25 rounded-full blur-3xl pointer-events-none" />

        {/* Bottom Headline */}
        <div className="relative z-10 text-white max-w-lg pb-6 md:pb-12">
          <p className="text-white/80 text-xs sm:text-sm font-normal tracking-wide">
            Never miss a price drop
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight leading-snug mt-2">
            Track, compare, and get instant alerts across Amazon, Flipkart, & Meesho.
          </h2>
        </div>
      </div>

      {/* 60% Right Form Column */}
      <div className="w-full md:w-[60%] min-h-screen flex flex-col justify-center items-center px-6 py-12 sm:px-12 lg:px-20 bg-white">
        <div className="w-full max-w-[440px]">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sign in to PricePulse
          </h1>
          <p className="text-slate-500 text-xs sm:text-[13px] mt-1.5 mb-7 leading-relaxed font-normal">
            Monitor real-time prices across major e-commerce stores, review price history charts, and manage your automated price-drop alerts.
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-[13px] text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-800 block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@pricetracker.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-indigo-500/10 bg-white placeholder-slate-400 transition-all shadow-sm"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-800 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-indigo-500/10 bg-white placeholder-slate-400 transition-all shadow-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs sm:text-sm shadow-[0_12px_24px_-6px_rgba(79,70,229,0.45)] hover:shadow-[0_16px_30px_-6px_rgba(79,70,229,0.5)] transition-all active:scale-[0.99] disabled:opacity-50 mt-4"
            >
              {loading ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Clean Switch & Demo Helper Links */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
            <p className="text-center text-xs sm:text-[13px] text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#4f46e5] hover:text-[#4338ca] font-medium">
                Sign up
              </Link>
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Quick demo:</span>
              <button
                type="button"
                onClick={() => fillDemo('user@pricetracker.com', 'user123')}
                className="text-indigo-600 hover:underline font-semibold"
              >
                User
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => fillDemo('admin@pricetracker.com', 'admin123')}
                className="text-emerald-600 hover:underline font-semibold"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
