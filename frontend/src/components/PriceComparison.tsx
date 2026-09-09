'use client';

import React from 'react';
import { PlatformBadge } from './PlatformBadge';
import { ExternalLink, RefreshCw, Award, AlertCircle } from 'lucide-react';

interface PlatformPrice {
  id: number;
  platform_id: number;
  platform_name: string;
  platform_slug: string;
  url: string;
  current_price: number | null;
  current_mrp: number | null;
  current_discount: number | null;
  currency: string;
  availability: string;
  rating: number | null;
  review_count: number;
  seller: string | null;
  status: string;
  isLowest: boolean;
  diffFromLowest: number;
}

interface PriceComparisonProps {
  platforms: PlatformPrice[];
  lowestPrice: {
    linkId: number;
    platformName: string;
    price: number;
    currency: string;
  } | null;
  onRefreshLink?: (linkId: number) => Promise<void>;
  refreshingId?: number | null;
}

export const PriceComparison: React.FC<PriceComparisonProps> = ({
  platforms,
  lowestPrice,
  onRefreshLink,
  refreshingId,
}) => {
  if (!platforms || platforms.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
        <p className="text-slate-500 text-sm">No platform links attached to this product yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lowestPrice && platforms.length > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-indigo-50/40 border border-emerald-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Best Deal Available</span>
              <p className="text-sm font-semibold text-slate-900">
                Lowest on <span className="text-emerald-700">{lowestPrice.platformName}</span> at{' '}
                <span className="text-emerald-600 font-bold">SAR {Number(lowestPrice.price).toLocaleString('en-SA')}</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Active Lowest
          </span>
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3">Current Price</th>
                <th className="px-5 py-3">MRP & Discount</th>
                <th className="px-5 py-3">Availability</th>
                <th className="px-5 py-3">Seller & Rating</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {platforms.map((p) => {
                const isLowest = p.isLowest;
                const hasPrice = p.current_price !== null && p.current_price > 0;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isLowest ? 'bg-emerald-50/50 hover:bg-emerald-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={p.platform_name || p.platform_slug} size="sm" />
                        {isLowest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300">
                            LOWEST
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {hasPrice ? (
                        <div>
                          <span className="text-sm font-bold text-slate-900">
                            SAR {Number(p.current_price).toLocaleString('en-SA')}
                          </span>
                          {!isLowest && p.diffFromLowest > 0 && (
                            <span className="block text-[10px] text-rose-600 font-medium">
                              +SAR {Number(p.diffFromLowest).toLocaleString('en-SA')} vs lowest
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> Price Pending
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {p.current_mrp ? (
                        <div>
                          <span className="text-xs text-slate-400 line-through">
                            SAR {Number(p.current_mrp).toLocaleString('en-SA')}
                          </span>
                          {p.current_discount && p.current_discount > 0 ? (
                            <span className="ml-2 text-xs font-bold text-emerald-600">
                              {p.current_discount}% off
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          (p.availability || '').toLowerCase().includes('out of stock')
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {p.availability || 'In Stock'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      <div>
                        <span className="block font-medium truncate max-w-[150px] text-slate-900">{p.seller || 'Verified Seller'}</span>
                        {p.rating ? (
                          <span className="text-amber-600 font-semibold">
                            ★ {p.rating}{' '}
                            <span className="text-slate-400 text-[10px]">({p.review_count?.toLocaleString() || 0})</span>
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onRefreshLink && (
                          <button
                            onClick={() => onRefreshLink(p.id)}
                            disabled={refreshingId === p.id}
                            title="Re-scrape current price"
                            className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === p.id ? 'animate-spin text-indigo-600' : ''}`} />
                          </button>
                        )}
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-medium text-slate-800 transition-all"
                        >
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
