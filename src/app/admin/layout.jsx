'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldAlert, 
  Users, 
  FileText, 
  AlertTriangle, 
  LayoutDashboard, 
  ArrowLeft, 
  LogOut,
  GraduationCap
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Route protection client-side sync
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <ShieldAlert className="absolute h-6 w-6 text-violet-400" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-400">Verifying Admin Credentials...</p>
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Manage Users', href: '/admin/users', icon: Users },
    { name: 'Manage Content', href: '/admin/notes', icon: FileText },
    { name: 'Report Queue', href: '/admin/reports', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-950/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-950/10 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Sidebar navigation */}
      <aside className="w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800/80 flex flex-col shrink-0 z-10 relative">
        {/* Brand Container */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-500/10">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-none">StudyHub</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">Admin Control</span>
          </div>
        </div>

        {/* Admin details */}
        <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-950/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-sm">
              {user.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user.name || 'Admin User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-300' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-all border border-transparent"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-slate-500" />
            Student Hub
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all border border-transparent cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0 text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main workspace area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10 relative">
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-400">System Secure: Administrator Authorized</span>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
