'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { api } from '../../services/api';
import { ProductCard } from '../../components/ProductCard';
import { PlatformBadge } from '../../components/PlatformBadge';
import {
  ShoppingBag,
  TrendingDown,
  Bell,
  Layers,
  Plus,
  ArrowRight,
  RefreshCw,
  ArrowDownRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [prodRes, alertRes, platRes] = await Promise.all([
        api.products.list(),
        api.alerts.list(),
        api.platforms.list(),
      ]);

      setProducts(prodRes.products || []);
      setAlerts(alertRes.alerts || []);
      setPlatforms(platRes.platforms || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const trackedProductsCount = products.length;
  const activeAlertsCount = alerts.filter((a) => a.is_active).length;
  const platformCount = platforms.length || 3;

  const recentChanges = [
    {
      id: 1,
      title: 'Samsung Galaxy S24 5G 256GB - Phantom Black',
      platform: 'Amazon Saudi Arabia',
      oldPrice: 3299,
      newPrice: 2999,
      difference: 300,
      percent: 9.1,
    },
    {
      id: 2,
      title: 'Apple iPhone 16 Pro 256GB - Desert Titanium',
      platform: 'Noon Saudi Arabia',
      oldPrice: 4999,
      newPrice: 4699,
      difference: 300,
      percent: 6.0,
    },
  ];

  if (authLoading || (loading && !products.length)) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-[#4f46e5] animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading your tracking dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tracked Products
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#4f46e5]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2.5">{trackedProductsCount || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">Active across stores</span>
        </div>

        <div className="glass-panel p-5 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Price Drops
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-800 mt-2.5">8</p>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">Savings opportunities</span>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2.5">{activeAlertsCount || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">Target threshold rules</span>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Platforms
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#4f46e5]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2.5">{platformCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">Amazon.sa, Noon, Jarir, eXtra</span>
        </div>
      </div>

      {/* Recent Price Changes Card */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Price Changes</h2>
              <p className="text-xs text-slate-500 font-normal">Live drops recorded during latest automated check cycles</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Live Drops
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentChanges.map((change) => (
            <div
              key={change.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div>
                <span className="text-[13px] font-semibold text-slate-900 block mb-1">{change.title}</span>
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={change.platform} size="sm" />
                  <span className="text-xs text-slate-600">
                    <span className="line-through text-slate-400">SAR {change.oldPrice.toLocaleString('en-SA')}</span>
                    {' '}→{' '}
                    <span className="text-emerald-700 font-semibold">SAR {change.newPrice.toLocaleString('en-SA')}</span>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <ArrowDownRight className="w-3 h-3" />
                  ↓ SAR {change.difference.toLocaleString('en-SA')}
                </span>
                <span className="block text-[10px] text-emerald-700 mt-0.5 font-semibold">
                  -{change.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Your Tracked Catalog</h2>
            <p className="text-xs text-slate-500 font-normal">Multi-link product comparisons and monitoring</p>
          </div>
          <Link
            href="/products"
            className="text-xs font-medium text-[#4f46e5] hover:text-[#4338ca] flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl bg-white shadow-xs">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">No products tracked yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Paste product links from Amazon.sa, Noon, Jarir, or eXtra to begin automated tracking and cross-platform price comparison.
            </p>
            <Link
              href="/products/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
