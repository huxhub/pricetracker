'use client';

import React from 'react';
import Link from 'next/link';
import { Tag, Layers, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: number;
    title: string;
    brand?: string;
    category?: string;
    image?: string;
    total_links?: number;
    lowest_price?: number | string | null;
    highest_price?: number | string | null;
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const hasPrice = product.lowest_price !== null && product.lowest_price !== undefined;

  return (
    <div className="glass-panel glass-panel-hover flex flex-col justify-between overflow-hidden group">
      {/* Product Image & Badges */}
      <div className="relative w-full h-52 bg-slate-50 flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400">
            <Tag className="w-8 h-8" />
          </div>
        )}

        {product.category && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-xs">
            {product.category}
          </span>
        )}

        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
          <Layers className="w-3 h-3" />
          {product.total_links || 1} {product.total_links === 1 ? 'Store' : 'Stores'}
        </span>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-white">
        <div>
          {product.brand && (
            <span className="text-[10px] font-semibold text-[#4f46e5] uppercase tracking-wider block mb-1">
              {product.brand}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#4f46e5] transition-colors">
            {product.title}
          </h3>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Lowest Price</span>
            {hasPrice ? (
              <span className="text-base font-bold text-emerald-600">
                SAR {Number(product.lowest_price).toLocaleString('en-SA')}
              </span>
            ) : (
              <span className="text-xs text-amber-600 font-medium">Checking...</span>
            )}
          </div>

          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-[#4f46e5] text-indigo-700 hover:text-white border border-indigo-200 text-xs font-medium transition-all shadow-xs"
          >
            Compare <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
