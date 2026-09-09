'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { api } from '../../services/api';
import { PlatformBadge } from '../../components/PlatformBadge';
import {
  ShieldCheck,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [platName, setPlatName] = useState('');
  const [platSlug, setPlatSlug] = useState('');
  const [platDomain, setPlatDomain] = useState('');
  const [platKey, setPlatKey] = useState('');
  const [submittingPlat, setSubmittingPlat] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/dashboard');
      } else {
        loadAdminData();
      }
    }
  }, [user, authLoading, router]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statRes, platRes, logRes] = await Promise.all([
        api.admin.getStatistics(),
        api.admin.getPlatforms(),
        api.admin.getScrapeLogs({ status: statusFilter || undefined, limit: 30 }),
      ]);

      setStats(statRes.statistics);
      setPlatforms(platRes.platforms || []);
      setLogs(logRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (status: string) => {
    setStatusFilter(status);
    try {
      const res = await api.admin.getScrapeLogs({ status: status || undefined, limit: 30 });
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePlatform = async (platformId: number, currentActive: boolean) => {
    try {
      await api.admin.updatePlatform(platformId, { isActive: !currentActive });
      setPlatforms((prev) =>
        prev.map((p) => (p.id === platformId ? { ...p, is_active: !currentActive } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPlat(true);
    try {
      await api.admin.createPlatform({
        name: platName,
        slug: platSlug || platName.toLowerCase(),
        domain: platDomain,
        scraperKey: platKey || platName.toLowerCase(),
        isActive: true,
      });
      setShowAddPlatform(false);
      setPlatName('');
      setPlatSlug('');
      setPlatDomain('');
      setPlatKey('');
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to add platform');
    } finally {
      setSubmittingPlat(false);
    }
  };

  if (authLoading || (loading && !stats)) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-[#4f46e5] animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading admin telemetry & logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-end">
        <button
          onClick={loadAdminData}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Users</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.totalUsers || 1}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">Registered accounts</span>
        </div>

        <div className="glass-panel p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Active URLs</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.activeUrls || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">Being monitored</span>
        </div>

        <div className="glass-panel p-5 border-emerald-200 bg-emerald-50/40">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Successful Scrapes</span>
          <p className="text-2xl font-bold text-emerald-800 mt-2">{stats?.successRate || 100}%</p>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">{stats?.successfulScrapes || 0} successful cycles</span>
        </div>

        <div className="glass-panel p-5 border-rose-200 bg-rose-50/40">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">Failed / Blocked</span>
          <p className="text-2xl font-bold text-rose-800 mt-2">{stats?.failedRate || 0}%</p>
          <span className="text-[11px] text-rose-700 mt-1 block font-medium">{stats?.failedScrapes || 0} failed / CAPTCHA</span>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Health & Adapters</h2>
            <p className="text-xs text-slate-500 font-normal">Manage supported e-commerce scrapers</p>
          </div>

          <button
            onClick={() => setShowAddPlatform(!showAddPlatform)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Platform
          </button>
        </div>

        {showAddPlatform && (
          <form onSubmit={handleCreatePlatform} className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Platform Name (e.g. Myntra)"
              value={platName}
              onChange={(e) => setPlatName(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs"
            />
            <input
              type="text"
              required
              placeholder="Domain (e.g. myntra.com)"
              value={platDomain}
              onChange={(e) => setPlatDomain(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs"
            />
            <input
              type="text"
              placeholder="Scraper Key (e.g. myntra)"
              value={platKey}
              onChange={(e) => setPlatKey(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs"
            />
            <button
              type="submit"
              disabled={submittingPlat}
              className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium disabled:opacity-50"
            >
              {submittingPlat ? 'Saving...' : 'Register'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PlatformBadge platform={p.name} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">{p.domain}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Tracked URLs: <strong className="text-slate-900 font-semibold">{p.trackedUrls || 0}</strong>
                </span>
              </div>

              <button
                onClick={() => handleTogglePlatform(p.id, p.is_active)}
                className={`text-xs font-medium px-3 py-1 rounded-lg border ${
                  p.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-500 border-slate-300'
                }`}
              >
                {p.is_active ? 'Active' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scrape Logs Explorer */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Scrape Telemetry Logs</h2>
            <p className="text-xs text-slate-500 font-normal">Audit trail of automated and on-demand scraping cycles</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['', 'SUCCESS', 'FAILED', 'CAPTCHA', 'TIMEOUT'].map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? 'bg-[#4f46e5] text-white border-[#4f46e5] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s || 'All Logs'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 font-semibold text-[11px]">
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Platform</th>
                <th className="px-4 py-2.5">Product / URL</th>
                <th className="px-4 py-2.5">Old Price</th>
                <th className="px-4 py-2.5">New Price</th>
                <th className="px-4 py-2.5">Diagnostic</th>
                <th className="px-4 py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-normal">
                    No scrape logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let badge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (log.status === 'SUCCESS') badge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                  else if (log.status === 'CAPTCHA') badge = 'bg-amber-50 text-amber-800 border-amber-300';
                  else badge = 'bg-rose-50 text-rose-800 border-rose-300';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${badge}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">
                        {log.platform_name || 'Generic'}
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <span className="text-slate-900 font-medium block truncate">
                          {log.product_title || 'URL Scrape'}
                        </span>
                        {log.url && (
                          <span className="text-[10px] text-slate-400 truncate block">{log.url}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 font-normal">
                        {log.old_price ? `SAR ${Number(log.old_price).toLocaleString('en-SA')}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-emerald-700">
                        {log.new_price ? `SAR ${Number(log.new_price).toLocaleString('en-SA')}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 max-w-[180px] text-slate-500 truncate font-mono text-[10px]">
                        {log.error_message || log.error_code || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400 text-[10px] whitespace-nowrap font-medium">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
