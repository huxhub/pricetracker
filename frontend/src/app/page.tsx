'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { BrandAsterisk } from '../components/BrandAsterisk';
import { ShoppingBag, ArrowRight, TrendingDown, Bell, Zap } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="py-12 md:py-20 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 mb-8 shadow-xs">
        <Zap className="w-3.5 h-3.5 text-indigo-600" />
        Multi-Platform Automated Price Tracking Engine
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-4xl text-slate-900 leading-tight">
        Never Overpay Online Again Across{' '}
        <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent">
          Amazon, Flipkart & Meesho
        </span>
      </h1>

      <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
        Paste any product link. Our scrapers monitor prices 24/7, highlight the guaranteed lowest store, chart historical fluctuations, and dispatch instant email alerts when prices plummet.
      </p>

      {/* Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/register"
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all group"
        >
          Start Tracking Free
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="/login"
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all"
        >
          Sign In to Dashboard
        </Link>
      </div>

      {/* Feature Cards */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl text-left">
        <div className="glass-panel p-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#4f46e5] mb-4">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Cross-Store Comparison</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Link multiple platform URLs to a single product and automatically uncover which marketplace has the guaranteed lowest active deal.
          </p>
        </div>

        <div className="glass-panel p-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
            <TrendingDown className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Historical Analytics</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Track day-by-day price changes with interactive SVG charts, average historical pricing, and highest vs lowest benchmarks.
          </p>
        </div>

        <div className="glass-panel p-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Smart Email Alerts</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Set custom price drop conditions or target thresholds. Anti-duplicate safeguards ensure you only get notified on real savings.
          </p>
        </div>
      </div>
    </div>
  );
}
