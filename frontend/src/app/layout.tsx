import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import { AppShell } from '../components/AppShell';

import { DrawerProvider } from '../context/DrawerContext';

export const metadata: Metadata = {
  title: 'PricePulse — Multi-Platform Price Comparison & Alert System',
  description: 'Track prices across Amazon, Flipkart, Meesho, compare live deals, visualize price history, and receive instant price drop email alerts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className="bg-[#f8fafc] text-slate-900 min-h-screen flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-900"
        suppressHydrationWarning
      >
        <AuthProvider>
          <DrawerProvider>
            <AppShell>{children}</AppShell>
          </DrawerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
