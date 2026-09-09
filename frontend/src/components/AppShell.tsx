'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { useAuth } from '../lib/auth';
import { useDrawer } from '../context/DrawerContext';
import { BrandAsterisk } from './BrandAsterisk';
import { Menu, PlusCircle, Bell, User as UserIcon } from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { openAddProduct } = useDrawer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <div className="min-h-screen w-full bg-white">{children}</div>;
  }

  // Helper to format page title and subtitle from pathname
  const getHeaderInfo = () => {
    if (pathname === '/dashboard')
      return {
        title: 'Dashboard',
        subtitle: 'Real-time price intelligence across Saudi Arabia\'s top e-commerce platforms',
      };
    if (pathname === '/products')
      return {
        title: 'Tracked Products',
        subtitle: 'Compare deals and view cross-platform price histories',
      };
    if (pathname === '/products/add')
      return {
        title: 'Add Product',
        subtitle: 'Paste multiple URLs across stores for automatic cross-platform price comparison',
      };
    if (pathname.startsWith('/products/'))
      return {
        title: 'Product Details & Comparison',
        subtitle: 'Live store pricing, lowest deal analysis, and historical trends',
      };
    if (pathname === '/alerts')
      return {
        title: 'Price Drop Alerts',
        subtitle: 'Active price drop thresholds and automated notification rules',
      };
    if (pathname === '/settings')
      return {
        title: 'Settings',
        subtitle: 'Manage profile and notification delivery rules',
      };
    if (pathname === '/admin')
      return {
        title: 'Admin Console',
        subtitle: 'Scraping engine telemetry, platform health & logs',
      };
    return {
      title: 'PricePulse',
      subtitle: 'Multi-platform price comparison & alert engine',
    };
  };

  const header = getHeaderInfo();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Reference Modern Floating Sidebar */}
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#f8fafc]/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {header.title}
              </h1>
              <p className="hidden sm:block text-xs sm:text-[13px] text-slate-500 font-normal">
                {header.subtitle}
              </p>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            {/* Contextual Action Button */}
            <button
              type="button"
              onClick={openAddProduct}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-[13px] font-medium shadow-md shadow-violet-500/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Track Product</span>
            </button>

            {/* User Profile Badge */}
            {user && (
              <div className="flex items-center gap-2.5 pl-2">
                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-semibold text-xs shadow-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-medium text-violet-600 uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-slate-200/80 bg-white/50 py-5 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>&copy; {new Date().getFullYear()} PricePulse &bull; Multi-Platform Price Comparison & Alert System</p>
            <div className="flex items-center gap-3 text-slate-400 font-medium">
              <span>Amazon.sa</span>
              <span>&bull;</span>
              <span>Noon</span>
              <span>&bull;</span>
              <span>Jarir</span>
              <span>&bull;</span>
              <span>eXtra</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
