'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { api } from '../../services/api';
import { ProductCard } from '../../components/ProductCard';
import {
  Plus,
  Search,
  ShoppingBag,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  Clock,
  ArrowRight,
  ExternalLink,
  Tag,
  Store,
  Layers,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface ProductLink {
  id: number;
  platform_id: number;
  platform_name: string;
  platform_slug: string;
  url: string;
  current_price: number | string | null;
  current_mrp: number | string | null;
  currency: string;
  status: string;
  availability: string;
  last_checked_at: string | null;
}

interface ProductItem {
  id: number;
  title: string;
  brand?: string;
  category?: string;
  image?: string;
  total_links?: number;
  lowest_price?: number | string | null;
  highest_price?: number | string | null;
  last_checked_at?: string | null;
  created_at?: string;
  links?: ProductLink[];
}

export default function ProductsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchProducts();
    }
  }, [user, authLoading, router]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.list({ search });
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const formatLastUpdated = (dateString?: string | null) => {
    if (!dateString) return 'Not checked yet';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPlatformBadgeStyle = (slugOrName: string) => {
    const s = (slugOrName || '').toLowerCase();
    if (s.includes('amazon')) {
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    }
    if (s.includes('noon')) {
      return 'bg-yellow-50 text-yellow-800 border-yellow-200/80';
    }
    if (s.includes('jarir')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    }
    if (s.includes('extra')) {
      return 'bg-sky-50 text-sky-700 border-sky-200/80';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Categories list derived from products
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracked products by title or brand..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-indigo-100 shadow-xs transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Category Filter Pills */}
          <div className="hidden sm:flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 text-xs">
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat as string)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-indigo-50 text-[#4f46e5] font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View (All Prices & Last Update)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-indigo-50 text-[#4f46e5] font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#4f46e5] animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-normal">Loading tracked items...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl bg-white shadow-xs">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            {search ? 'Try adjusting your search keywords.' : 'Add your first e-commerce URL to begin monitoring.'}
          </p>
          <Link
            href="/products/add"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Track New Product
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE FORMAT: Shows Each Store Price & Last Update Timestamp */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5 min-w-[190px]">Product</th>
                  <th className="py-3 px-2.5 min-w-[160px]">Live Store Prices</th>
                  <th className="py-3 px-2.5 min-w-[95px]">Lowest Price</th>
                  <th className="py-3 px-2.5 min-w-[105px]">Last Checked</th>
                  <th className="py-3 px-3.5 text-right min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((p) => {
                  const hasLowest = p.lowest_price !== null && p.lowest_price !== undefined;
                  const lowestNum = hasLowest ? Number(p.lowest_price) : null;
                  const links = p.links || [];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* 1. Product Thumbnail & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center overflow-hidden">
                            {p.image ? (
                              <img src={p.image} alt={p.title} className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Tag className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {p.brand && (
                                <span className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-wide">
                                  {p.brand}
                                </span>
                              )}
                              {p.category && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/products/${p.id}`}
                              className="font-semibold text-slate-900 line-clamp-2 leading-tight hover:text-[#4f46e5] transition-colors"
                              title={p.title}
                            >
                              {p.title}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* 2. Live Store Prices (All Current Prices Showing) */}
                      <td className="py-3.5 px-4">
                        {links.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">No active links</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {links.map((link) => {
                              const badgeStyle = getPlatformBadgeStyle(link.platform_slug || link.platform_name);
                              const priceNum = link.current_price !== null ? Number(link.current_price) : null;
                              const isLowest = hasLowest && priceNum !== null && priceNum === lowestNum;
                              const isBlocked = link.status === 'BLOCKED' || (link.status === 'FAILED' && link.platform_slug === 'noon_sa');

                              return (
                                <a
                                  key={link.id}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Open on ${link.platform_name} • Last checked: ${formatLastUpdated(link.last_checked_at)}`}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all hover:shadow-xs ${badgeStyle} ${
                                    isLowest ? 'ring-1 ring-emerald-500/40 bg-emerald-50/50' : ''
                                  }`}
                                >
                                  <span className="font-medium">{link.platform_name.split(' ')[0]}:</span>
                                  {isBlocked ? (
                                    <span className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5">
                                      <ShieldAlert className="w-2.5 h-2.5" /> Blocked
                                    </span>
                                  ) : priceNum !== null ? (
                                    <span className={`font-semibold ${isLowest ? 'text-emerald-700' : 'text-slate-900'}`}>
                                      SAR {priceNum.toLocaleString('en-SA')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">Unchecked</span>
                                  )}
                                  <ExternalLink className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 3. Lowest Price */}
                      <td className="py-3 px-2.5">
                        {hasLowest ? (
                          <div>
                            <div className="text-sm font-bold text-emerald-600 tracking-tight">
                              SAR {lowestNum?.toLocaleString('en-SA')}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Best Deal
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px]">Pending...</span>
                        )}
                      </td>

                      {/* 4. Last Updated Timestamp */}
                      <td className="py-3 px-2.5 text-slate-500" suppressHydrationWarning>
                        <div
                          className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                          title={p.last_checked_at ? new Date(p.last_checked_at).toLocaleString() : 'Never checked'}
                          suppressHydrationWarning
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700" suppressHydrationWarning>
                            {formatLastUpdated(p.last_checked_at)}
                          </span>
                        </div>
                        {p.last_checked_at && (
                          <span className="block text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>
                            {new Date(p.last_checked_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </td>

                      {/* 5. Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <Link
                          href={`/products/${p.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-[#4f46e5] text-indigo-700 hover:text-white border border-indigo-200 text-[11px] font-medium transition-all shadow-xs"
                        >
                          Compare <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="py-3 px-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> tracked products
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <RefreshCw className="w-3 h-3" /> Automatically monitored hourly
            </span>
          </div>
        </div>
      ) : (
        /* GRID VIEW (Alternative Card Format) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
