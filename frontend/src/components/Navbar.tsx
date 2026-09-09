'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { BrandAsterisk } from './BrandAsterisk';
import { ShoppingBag, Bell, LayoutDashboard, PlusCircle, Shield, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Tracked Products', href: '/products', icon: ShoppingBag },
    { label: 'Price Alerts', href: '/alerts', icon: Bell },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ label: 'Admin Panel', href: '/admin', icon: Shield });
  }

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/85 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <BrandAsterisk className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            PricePulse
          </span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              href="/products/add"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Track Product</span>
            </Link>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">{user.name}</span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{user.role}</span>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm transition-all"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
