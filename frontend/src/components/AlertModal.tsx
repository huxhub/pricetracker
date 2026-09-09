'use client';

import React, { useState } from 'react';
import { api } from '../services/api';
import { Bell, X, Check, ArrowDown, DollarSign } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLinkId: number;
  productTitle: string;
  currentPrice: number | null;
  onSuccess?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  productLinkId,
  productTitle,
  currentPrice,
  onSuccess,
}) => {
  const [alertType, setAlertType] = useState<'PRICE_DROP' | 'TARGET_PRICE' | 'ANY_PRICE_CHANGE'>('PRICE_DROP');
  const [targetPrice, setTargetPrice] = useState<string>(
    currentPrice ? String(Math.floor(currentPrice * 0.95)) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.alerts.create({
        productLinkId,
        alertType,
        targetPrice: alertType === 'TARGET_PRICE' ? parseFloat(targetPrice) : undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to configure alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#4f46e5] shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Create Price Alert</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{productTitle}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Alert Configured Successfully!</p>
            <p className="text-xs text-slate-500 mt-1">We will notify your email when condition triggers.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-800 block mb-1.5">Alert Condition</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAlertType('PRICE_DROP')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    alertType === 'PRICE_DROP'
                      ? 'bg-indigo-50 border-[#4f46e5] text-[#4f46e5] shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-600" />
                  Price Drop
                </button>
                <button
                  type="button"
                  onClick={() => setAlertType('TARGET_PRICE')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    alertType === 'TARGET_PRICE'
                      ? 'bg-indigo-50 border-[#4f46e5] text-[#4f46e5] shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 mx-auto mb-1 text-amber-600" />
                  Target Price
                </button>
                <button
                  type="button"
                  onClick={() => setAlertType('ANY_PRICE_CHANGE')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    alertType === 'ANY_PRICE_CHANGE'
                      ? 'bg-indigo-50 border-[#4f46e5] text-[#4f46e5] shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-600" />
                  Any Change
                </button>
              </div>
            </div>

            {alertType === 'TARGET_PRICE' && (
              <div>
                <label className="text-xs font-medium text-slate-800 block mb-1.5">
                  Target Price Threshold (SAR)
                </label>
                <input
                  type="number"
                  required
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-indigo-100"
                />
                {currentPrice && (
                  <span className="text-[11px] text-slate-500 mt-1 block font-normal">
                    Current price is SAR {Number(currentPrice).toLocaleString('en-SA')}
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Saving Alert...' : 'Set Alert'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
