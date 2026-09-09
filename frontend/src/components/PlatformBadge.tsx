'use client';

import React from 'react';

interface PlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({ platform, size = 'md' }) => {
  const name = (platform || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = platform;

  if (name.includes('amazon')) {
    styles = 'bg-amber-50 text-amber-800 border-amber-200/80';
    label = 'Amazon.sa';
  } else if (name.includes('noon')) {
    styles = 'bg-yellow-50 text-yellow-800 border-yellow-200/80';
    label = 'Noon';
  } else if (name.includes('jarir')) {
    styles = 'bg-red-50 text-red-700 border-red-200/80';
    label = 'Jarir';
  } else if (name.includes('extra')) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200/80';
    label = 'eXtra';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-normal',
    md: 'px-2.5 py-0.5 text-[11px] font-medium',
    lg: 'px-3 py-1 text-xs font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide ${styles} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};
