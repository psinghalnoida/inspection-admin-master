'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const pageTitles = {
  '/': 'Dashboard',
  '/surveyors': 'Surveyors',
  '/assigners': 'Assigners',
  '/surveys': 'Surveys',
  '/billing': 'Billing',
  '/exports': 'Exports',
  '/pricing': 'Pricing Tiers',
  '/coupons': 'Coupons',
  '/disputes': 'Dispute Management',
  '/settings': 'Manage Settings',
  '/payouts': 'Payouts',
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div>
      </div>
    );
  }

  const getTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    if (pathname.startsWith('/surveyors/')) return 'Surveyor Details';
    if (pathname.startsWith('/assigners/') && pathname.endsWith('/ledger')) return 'Assigner Ledger';
    if (pathname.startsWith('/assigners/')) return 'Assigner Details';
    if (pathname.startsWith('/surveys/')) return 'Survey Details';
    if (pathname.startsWith('/payouts/')) return 'Wallet Details';
    if (pathname.startsWith('/billing/')) return 'Create Invoice';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-64 min-h-screen flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} title={getTitle()} />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
