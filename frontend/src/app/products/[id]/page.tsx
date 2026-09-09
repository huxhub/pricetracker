'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../services/api';
import { PriceComparison } from '../../../components/PriceComparison';
import { PriceChart } from '../../../components/PriceChart';
import { AlertModal } from '../../../components/AlertModal';
import {
  Bell,
  RefreshCw,
  Plus,
  ArrowLeft,
  Tag,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedLinkForAlert, setSelectedLinkForAlert] = useState<any>(null);

  const [showAddLink, setShowAddLink] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await api.products.getById(id as string);
      setProduct(res.product);
    } catch (err: any) {
      console.error(err);
      setFeedback(err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLink = async (linkId: number) => {
    setRefreshingId(linkId);
    try {
      await api.products.refreshLink(id as string, linkId);
      await loadProduct();
    } catch (err) {
      console.error('Refresh link error:', err);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleRefreshAll = async () => {
    if (!product?.platforms) return;
    setRefreshingAll(true);
    try {
      for (const pl of product.platforms) {
        await api.products.refreshLink(id as string, pl.id).catch(() => {});
      }
      await loadProduct();
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAddingLink(true);
    setFeedback(null);

    try {
      await api.products.addLink(id as string, { url: newUrl.trim() });
      setNewUrl('');
      setShowAddLink(false);
      await loadProduct();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to add link');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm('Are you sure you want to stop tracking this product?')) return;
    try {
      await api.products.delete(id as string);
      router.push('/products');
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const openAlertModal = (linkObj?: any) => {
    const target = linkObj || product?.platforms?.[0];
    setSelectedLinkForAlert(target);
    setAlertModalOpen(true);
  };

  if (loading && !product) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-[#4f46e5] animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading live product details & charts...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <Link href="/products" className="text-xs font-bold text-[#4f46e5] hover:underline">
          &larr; Back to Catalog
        </Link>
      </div>
    );
  }

  const lowestPrice = product.lowestPrice;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Action toolbar */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingAll ? 'animate-spin text-[#4f46e5]' : ''}`} />
            Re-check All Prices
          </button>

          <button
            onClick={() => openAlertModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all"
          >
            <Bell className="w-3.5 h-3.5" />
            Set Alert
          </button>

          <button
            onClick={handleDeleteProduct}
            title="Delete Product"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 font-medium">
          {feedback}
        </div>
      )}

      {/* Hero */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="w-full md:w-64 h-64 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-4 shrink-0 overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain" />
          ) : (
            <Tag className="w-12 h-12 text-slate-300" />
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            {product.brand && (
              <span className="text-[11px] font-bold text-[#4f46e5] uppercase tracking-wider">
                {product.brand}
              </span>
            )}
            {product.category && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                {product.category}
              </span>
            )}
          </div>

          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
            {product.title}
          </h1>

          {product.description && (
            <p className="text-xs sm:text-[13px] text-slate-500 line-clamp-3 leading-relaxed">
              {product.description}
            </p>
          )}

          {lowestPrice && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
              <div>
                <span className="text-xs text-slate-500 font-normal block">Current Best Price:</span>
                <span className="text-xl font-bold text-emerald-700">
                  SAR {Number(lowestPrice.price).toLocaleString('en-SA')}
                </span>
                <span className="text-xs text-slate-500 font-normal ml-2">on {lowestPrice.platformName}</span>
              </div>

              <button
                onClick={() => openAlertModal()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-all"
              >
                <Bell className="w-3.5 h-3.5" />
                Alert When Price Drops Below SAR {Math.floor(lowestPrice.price * 0.95).toLocaleString('en-SA')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Cross-Platform Comparison</h2>
            <p className="text-xs text-slate-500 font-normal">Live price breakdown across linked stores</p>
          </div>

          <button
            onClick={() => setShowAddLink(!showAddLink)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#4f46e5]" />
            Link Another Store URL
          </button>
        </div>

        {showAddLink && (
          <form onSubmit={handleAddLinkSubmit} className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <label className="text-xs font-medium text-slate-800 block">
              Paste URL from another platform (Amazon / Flipkart / Meesho)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#4f46e5]"
              />
              <button
                type="submit"
                disabled={addingLink}
                className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-medium shadow-md disabled:opacity-50"
              >
                {addingLink ? 'Scraping...' : 'Add Link'}
              </button>
            </div>
          </form>
        )}

        <PriceComparison
          platforms={product.platforms || []}
          lowestPrice={lowestPrice}
          onRefreshLink={handleRefreshLink}
          refreshingId={refreshingId}
        />
      </div>

      {/* History */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Price History & Trends</h2>
          <p className="text-xs text-slate-500 font-normal">Historical fluctuation timeline and stats</p>
        </div>

        <PriceChart
          history={product.priceHistory || []}
          statistics={product.statistics || {}}
        />
      </div>

      {selectedLinkForAlert && (
        <AlertModal
          isOpen={alertModalOpen}
          onClose={() => setAlertModalOpen(false)}
          productLinkId={selectedLinkForAlert.id}
          productTitle={product.title}
          currentPrice={selectedLinkForAlert.current_price}
        />
      )}
    </div>
  );
}
