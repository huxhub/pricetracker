'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { api } from '../../services/api';
import { PlatformBadge } from '../../components/PlatformBadge';
import { Bell, Trash2, RefreshCw } from 'lucide-react';

export default function AlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadAlerts();
    }
  }, [user, authLoading, router]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.alerts.list();
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (alertId: number, currentActive: boolean) => {
    try {
      await api.alerts.update(alertId, { isActive: !currentActive });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_active: !currentActive } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (alertId: number) => {
    if (!confirm('Remove this price alert?')) return;
    try {
      await api.alerts.delete(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#4f46e5] animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl bg-white shadow-xs">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">No active price alerts</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5 font-normal">
            Visit any tracked product and click &quot;Set Alert&quot; to receive instant email notifications.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-md shadow-indigo-600/20"
          >
            Browse Tracked Products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {alert.product_image ? (
                  <img
                    src={alert.product_image}
                    alt={alert.product_title}
                    className="w-14 h-14 object-contain rounded-xl bg-slate-50 p-1 border border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                    <Bell className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <Link
                    href={`/products/${alert.product_id}`}
                    className="text-[13px] font-semibold text-slate-900 hover:text-[#4f46e5] transition-colors line-clamp-1"
                  >
                    {alert.product_title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <PlatformBadge platform={alert.platform_name || alert.platform_slug} size="sm" />

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                      {alert.alert_type === 'PRICE_DROP' && '🔥 Any Price Drop'}
                      {alert.alert_type === 'TARGET_PRICE' && `🎯 Below SAR ${Number(alert.target_price).toLocaleString('en-SA')}`}
                      {alert.alert_type === 'ANY_PRICE_CHANGE' && '🔔 Any Price Fluctuation'}
                    </span>

                    {alert.current_price && (
                      <span className="text-[11px] text-slate-500 font-normal">
                        Current: <strong className="text-slate-900 font-semibold">SAR {Number(alert.current_price).toLocaleString('en-SA')}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => handleToggle(alert.id, alert.is_active)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    alert.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {alert.is_active ? 'Active' : 'Paused'}
                </button>

                <button
                  onClick={() => handleDelete(alert.id)}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
