'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../services/api';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Link as LinkIcon,
  Store,
} from 'lucide-react';

interface UrlRow {
  url: string;
  platformId: string;
  detectedSlug: string | null;
}

interface AddProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: any) => void;
}

export const AddProductDrawer: React.FC<AddProductDrawerProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const router = useRouter();

  const [rows, setRows] = useState<UrlRow[]>([
    { url: '', platformId: 'auto', detectedSlug: null },
  ]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapeState, setScrapeState] = useState<'idle' | 'fetching' | 'success' | 'partial_error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<any>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const detectPlatform = (inputUrl: string): string | null => {
    try {
      const lower = inputUrl.toLowerCase();
      if (lower.includes('amazon.sa')) return 'amazon_sa';
      if (lower.includes('amazon.')) return 'amazon_sa';
      if (lower.includes('noon.')) return 'noon_sa';
      if (lower.includes('jarir.')) return 'jarir';
      if (lower.includes('extra.')) return 'extra';
      return null;
    } catch {
      return null;
    }
  };

  const handleUrlChange = (index: number, val: string) => {
    const updated = [...rows];
    updated[index].url = val;
    updated[index].detectedSlug = detectPlatform(val);
    setRows(updated);
  };

  const handlePlatformChange = (index: number, val: string) => {
    const updated = [...rows];
    updated[index].platformId = val;
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { url: '', platformId: 'auto', detectedSlug: null }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const fillSampleDemo = () => {
    setRows([
      {
        url: 'https://www.amazon.sa/dp/B0CS5X878Z',
        platformId: 'auto',
        detectedSlug: 'amazon_sa',
      },
      {
        url: 'https://www.noon.com/saudi-en/samsung-galaxy-s24-5g-256gb-phantom-black/p-sam123456/',
        platformId: 'auto',
        detectedSlug: 'noon_sa',
      },
      {
        url: 'https://www.jarir.com/sa-en/samsung-galaxy-s24.html',
        platformId: 'auto',
        detectedSlug: 'jarir',
      },
    ]);
    setTitle('Samsung Galaxy S24 5G 256GB');
  };

  const resetForm = () => {
    setRows([{ url: '', platformId: 'auto', detectedSlug: null }]);
    setTitle('');
    setError(null);
    setScrapeState('idle');
    setCreatedProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validUrls = rows.filter((r) => r.url.trim().length > 0);
    if (validUrls.length === 0) {
      setError('Please paste at least one valid product URL.');
      return;
    }

    setLoading(true);
    setScrapeState('fetching');
    setStatusMessage('Connecting to store scrapers & fetching live prices...');

    try {
      const payload = validUrls.map((r) => ({
        url: r.url.trim(),
        platformId: r.platformId !== 'auto' ? parseInt(r.platformId, 10) : undefined,
      }));

      const res = await api.products.create({
        urls: payload,
        title: title.trim() || undefined,
      });

      setCreatedProduct(res.product);
      setScrapeState('success');
      setStatusMessage('✓ Product fetched and active tracking enabled!');
      if (onProductCreated) {
        onProductCreated(res.product);
      }
    } catch (err: any) {
      console.error(err);
      setScrapeState('partial_error');
      setError(err.message || 'Unable to fetch product. Please check the URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-over Right Drawer Panel (shadcn Sheet style) */}
      <div
        className={`
          fixed inset-y-0 right-0 w-full max-w-lg sm:max-w-xl bg-white
          shadow-[0_0_50px_rgba(0,0,0,0.15)] border-l border-slate-200/80
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Track New Product
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Paste product links to compare and monitor prices automatically
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">


          {/* Success State View */}
          {scrapeState === 'success' && createdProduct ? (
            <div className="p-6 rounded-2xl text-center space-y-4 border border-emerald-200 bg-emerald-50/40">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Product Successfully Tracked
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {createdProduct.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {createdProduct.platforms?.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium shadow-2xs"
                  >
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span className="text-slate-700 font-medium">{p.platform_name}</span>
                    {p.current_price && (
                      <span className="font-bold text-slate-900">
                        SAR {Number(p.current_price).toLocaleString('en-SA')}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 flex flex-col sm:flex-row justify-center gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-white bg-slate-50 transition-colors"
                >
                  Track Another Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/products/${createdProduct.id}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium shadow-md shadow-violet-500/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  View Comparison <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <form id="drawer-add-product-form" onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Product Title Input */}
              <div>
                <label className="text-xs font-medium text-slate-800 block mb-1.5">
                  Product Title{' '}
                  <span className="text-slate-400 font-normal">
                    (Optional — auto-extracted if empty)
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Samsung Galaxy S24 128GB Black"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-violet-100 transition-colors shadow-2xs"
                />
              </div>

              {/* URL Input Rows */}
              <div>
                <label className="text-xs font-medium text-slate-800 block mb-1.5">
                  Product URLs{' '}
                  <span className="text-slate-400 font-normal">
                    (Amazon.sa, Noon, Jarir, eXtra)
                  </span>
                </label>

                <div className="space-y-3">
                  {rows.map((row, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="url"
                            required
                            value={row.url}
                            onChange={(e) => handleUrlChange(index, e.target.value)}
                            placeholder="https://amazon.sa/dp/... or https://noon.com/saudi-en/..."
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-violet-100 transition-colors"
                          />
                        </div>

                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove URL"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Store className="w-3.5 h-3.5" />
                          <span>Platform:</span>
                          <span className="font-medium text-slate-800 uppercase">
                            {row.detectedSlug || 'Auto-detect'}
                          </span>
                        </div>

                        <select
                          value={row.platformId}
                          onChange={(e) => handlePlatformChange(index, e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-[#7c3aed]"
                        >
                          <option value="auto">Auto-detect platform</option>
                          <option value="1">Amazon Saudi Arabia</option>
                          <option value="2">Noon Saudi Arabia</option>
                          <option value="3">Jarir Bookstore</option>
                          <option value="4">eXtra Stores</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addRow}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another store URL
                </button>
              </div>

              {/* Live Loading Message */}
              {loading && (
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-3 text-xs text-violet-900 font-medium">
                  <RefreshCw className="w-4 h-4 text-[#7c3aed] animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-white transition-colors"
          >
            Cancel
          </button>

          {scrapeState !== 'success' && (
            <button
              type="submit"
              form="drawer-add-product-form"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium shadow-md shadow-violet-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching Prices...</span>
                </>
              ) : (
                <>
                  <span>Start Tracking & Compare</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
