'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { User, Bell, Shield, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <form onSubmit={handleSave} className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-[#4f46e5]" />
            User Account
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Name</label>
              <input
                type="text"
                disabled
                value={user?.name || ''}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium opacity-90"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium opacity-90"
              />
            </div>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[#4f46e5] text-[11px] font-medium">
              <Shield className="w-3.5 h-3.5" />
              Role: {user?.role || 'USER'}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            Email Notification Preferences
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Instant Price Drop Alerts</span>
                <span className="text-xs text-slate-500 font-normal">Receive an email immediately when a target price threshold is satisfied</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#4f46e5] rounded"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Daily Price Summary Digest</span>
                <span className="text-xs text-slate-500 font-normal">Receive a daily recap of all monitored marketplace changes</span>
              </div>
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="w-4 h-4 accent-[#4f46e5] rounded"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          {saved ? (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
