'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { FlaticonMenuIcon } from './FlaticonMenuIcon';
import {
  LayoutDashboard,
  ShoppingBag,
  Bell,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Tracked Products', href: '/products', icon: ShoppingBag },
    { label: 'Price Alerts', href: '/alerts', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ label: 'Admin Panel', href: '/admin', icon: Shield });
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:sticky top-4 z-40
          h-[calc(100vh-2rem)] my-0 lg:my-4 ml-0 lg:ml-4
          bg-white rounded-[28px] sm:rounded-[32px]
          border border-slate-200/80 shadow-[0_12px_40px_rgba(30,41,59,0.06)]
          flex flex-col justify-between
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[240px]'}
          ${isMobileOpen ? 'translate-x-4 w-[240px]' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Top Header Section */}
        <div className="p-3.5 sm:p-4">
          {isCollapsed ? (
            /* Collapsed State: Centered Flaticon Hamburger Icon to Expand */
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all hover:scale-105 active:scale-95"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <FlaticonMenuIcon className="w-5 h-5 text-slate-700" />
              </button>
            </div>
          ) : (
            /* Expanded State: Flaticon Hamburger Icon + Brand Title */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="hidden lg:flex w-10 h-10 rounded-2xl flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <FlaticonMenuIcon className="w-5 h-5 text-slate-700" />
                </button>

                <Link
                  href="/dashboard"
                  className="flex items-center overflow-hidden"
                  onClick={onCloseMobile}
                >
                  <span className="text-lg font-bold tracking-tight text-slate-950 hover:text-violet-600 transition-colors whitespace-nowrap">
                    PricePulse
                  </span>
                </Link>
              </div>

              {/* Close Button on Mobile */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-3.5 rounded-full transition-all duration-200
                    ${isCollapsed ? 'justify-center w-11 h-11 mx-auto px-0' : 'px-4 py-3 w-full'}
                    ${
                      isActive
                        ? 'bg-[#7c3aed] text-white font-medium shadow-md shadow-violet-500/25'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-normal'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                  {!isCollapsed && (
                    <span className="text-[13px] whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Help, Logout, Theme Switch */}
        <div className="p-4 sm:p-5 border-t border-slate-100 space-y-2">
          {/* Help Link */}
          <Link
            href="/settings"
            onClick={onCloseMobile}
            title={isCollapsed ? 'Help' : undefined}
            className={`
              flex items-center gap-3.5 rounded-full transition-colors
              ${isCollapsed ? 'justify-center w-11 h-11 mx-auto px-0' : 'px-4 py-2.5 w-full'}
              text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-normal
            `}
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0 text-slate-500" />
            {!isCollapsed && <span className="text-[13px]">Help</span>}
          </Link>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => {
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            title={isCollapsed ? 'Log out' : undefined}
            className={`
              flex items-center gap-3.5 rounded-full transition-colors w-full
              ${isCollapsed ? 'justify-center w-11 h-11 mx-auto px-0' : 'px-4 py-2.5'}
              text-slate-600 hover:text-rose-600 hover:bg-rose-50/80 font-normal
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-slate-500 hover:text-rose-600" />
            {!isCollapsed && <span className="text-[13px]">Log out</span>}
          </button>

          {/* Theme Toggle Pill matching reference image */}
          <div className="pt-2 flex justify-center lg:justify-start">
            {isCollapsed ? (
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shadow-sm shadow-violet-500/25 transition-transform active:scale-95"
                title="Toggle Theme"
              >
                <Sun className="w-4 h-4" />
              </button>
            ) : (
              <div className="inline-flex items-center bg-slate-100 rounded-full p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    theme === 'light'
                      ? 'bg-[#7c3aed] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Light Theme"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    theme === 'dark'
                      ? 'bg-[#7c3aed] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Dark Theme"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
