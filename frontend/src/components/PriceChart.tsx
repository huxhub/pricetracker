'use client';

import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface HistoryPoint {
  id: number;
  product_link_id: number;
  price: number;
  mrp?: number;
  discount?: number;
  platform_name?: string;
  checked_at: string;
}

interface PriceChartProps {
  history: HistoryPoint[];
  statistics: {
    highestPrice: number | null;
    lowestPrice: number | null;
    averagePrice: number | null;
    currentPrice: number | null;
  };
}

export const PriceChart: React.FC<PriceChartProps> = ({ history, statistics }) => {
  const [hoveredPoint, setHoveredPoint] = useState<HistoryPoint | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
        <p className="text-slate-500 text-sm">No price history points recorded yet.</p>
      </div>
    );
  }

  const width = 700;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const prices = history.map((h) => Number(h.price));
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  const getX = (index: number) => {
    if (history.length === 1) return width / 2;
    return paddingX + (index / (history.length - 1)) * (width - paddingX * 2);
  };

  const getY = (price: number) => {
    return height - paddingY - ((price - minPrice) / priceRange) * (height - paddingY * 2);
  };

  const points = history.map((h, i) => `${getX(i)},${getY(Number(h.price))}`).join(' ');

  const firstX = getX(0);
  const lastX = getX(history.length - 1);
  const bottomY = height - paddingY;
  const areaPath = `M ${firstX},${bottomY} L ${points.replace(/ /g, ' L ')} L ${lastX},${bottomY} Z`;

  return (
    <div className="space-y-6">
      {/* Analytics Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Current</span>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {statistics.currentPrice ? `SAR ${Number(statistics.currentPrice).toLocaleString('en-SA')}` : '—'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Lowest</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-base font-bold text-emerald-700 mt-1 block">
            {statistics.lowestPrice ? `SAR ${Number(statistics.lowestPrice).toLocaleString('en-SA')}` : '—'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block">Highest</span>
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <span className="text-base font-bold text-rose-700 mt-1 block">
            {statistics.highestPrice ? `SAR ${Number(statistics.highestPrice).toLocaleString('en-SA')}` : '—'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Average</span>
          <span className="text-base font-bold text-indigo-600 mt-1 block">
            {statistics.averagePrice ? `SAR ${Number(statistics.averagePrice).toLocaleString('en-SA')}` : '—'}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4f46e5]" />
            Price History Trajectory
          </span>
          {hoveredPoint && (
            <div className="text-xs bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-indigo-800 font-medium shadow-xs">
              {new Date(hoveredPoint.checked_at).toLocaleDateString()} &bull;{' '}
              <span className="font-bold text-indigo-950">SAR {Number(hoveredPoint.price).toLocaleString('en-SA')}</span>{' '}
              {hoveredPoint.platform_name && `(${hoveredPoint.platform_name})`}
            </div>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
            <defs>
              <linearGradient id="chartGradientLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1={paddingX} y1={bottomY} x2={width - paddingX} y2={bottomY} stroke="#e2e8f0" />

            <path d={areaPath} fill="url(#chartGradientLight)" />

            <polyline
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {history.map((h, i) => {
              const cx = getX(i);
              const cy = getY(Number(h.price));
              const isHovered = hoveredPoint?.id === h.id;

              return (
                <g key={h.id} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(h)} onMouseLeave={() => setHoveredPoint(null)}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? '#0ea5e9' : '#4f46e5'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all"
                  />
                  {(i === 0 || i === history.length - 1 || history.length < 6) && (
                    <text x={cx} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
                      {new Date(h.checked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
