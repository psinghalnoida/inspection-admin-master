'use client';

import { useState, useRef, useEffect } from 'react';
import { getCurrentUser, logout } from '@/lib/auth';

export default function Header({ onMenuClick, title }) {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        onClick={onMenuClick}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Page title */}
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-4">
        {/* Search (optional) */}
        <div className="relative hidden md:block">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="w-60 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD] focus:ring-2 focus:ring-[#AC9AFD]/20"
          />
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="w-9 h-9 rounded-full bg-[#AC9AFD] flex items-center justify-center font-semibold text-sm text-white">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {user?.full_name || 'Admin'}
            </span>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-slate-400">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-slate-50">
                <p className="font-semibold text-slate-800">{user?.full_name || 'Admin'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'admin@claimsmitra.com'}</p>
              </div>
              <div className="h-px bg-slate-200"></div>
              <button
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={handleLogout}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
