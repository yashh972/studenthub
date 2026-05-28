'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Upload, 
  BrainCircuit, 
  MessageSquare, 
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        throw new Error('Failed to load system statistics.');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
        <div className="w-10 h-10 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Assembling Admin Overview Metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/20 border border-red-800/40 text-red-200 text-sm max-w-md mx-auto text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <p className="font-semibold mb-1">Audit Failed</p>
        <p>{error}</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-800/60 hover:bg-red-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
          Try Again
        </button>
      </div>
    );
  }

  const { stats, activities } = data;

  const statCards = [
    {
      name: 'Total Students',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-violet-600 to-fuchsia-600',
      shadow: 'shadow-violet-500/10',
      href: '/admin/users'
    },
    {
      name: 'Text Notes',
      value: stats.totalNotes,
      icon: FileText,
      color: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/10',
      href: '/admin/notes'
    },
    {
      name: 'PDF Uploads',
      value: stats.totalUploads,
      icon: Upload,
      color: 'from-cyan-600 to-blue-600',
      shadow: 'shadow-cyan-500/10',
      href: '/admin/notes'
    },
    {
      name: 'Quiz Sessions',
      value: stats.totalQuizzes,
      icon: BrainCircuit,
      color: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/10',
      href: '/admin'
    },
    {
      name: 'Messages Logged',
      value: stats.totalMessages,
      icon: MessageSquare,
      color: 'from-amber-600 to-orange-600',
      shadow: 'shadow-amber-500/10',
      href: '/admin'
    },
    {
      name: 'Active Reports',
      value: stats.totalReports,
      icon: AlertTriangle,
      color: 'from-red-600 to-rose-600',
      shadow: 'shadow-red-500/10',
      href: '/admin/reports'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Administrative Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Audit high-level platform activity, inspect analytics, and monitor report queues.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link key={idx} href={card.href}>
              <div className={`group bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-6 transition-all duration-300 shadow-xl ${card.shadow} cursor-pointer hover:-translate-y-1`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.name}</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2 group-hover:text-violet-300 transition-colors">{card.value}</h3>
                  </div>
                  <div className={`p-3.5 rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Open Audit Area
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sub-grid: Recent Actions & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed Card */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white leading-tight">Recent System Activity</h4>
                <p className="text-xs text-slate-500">Live platform operations audited across databases</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {activities && activities.length > 0 ? (
              activities.map((act, index) => {
                let badgeColor = 'bg-slate-800 text-slate-400';
                if (act.type === 'user') badgeColor = 'bg-violet-950/60 border border-violet-850/50 text-violet-300';
                if (act.type === 'note') badgeColor = 'bg-blue-950/60 border border-blue-850/50 text-blue-300';
                if (act.type === 'pdf') badgeColor = 'bg-cyan-950/60 border border-cyan-850/50 text-cyan-300';
                if (act.type === 'report') badgeColor = 'bg-red-950/60 border border-red-850/50 text-red-300';

                return (
                  <div key={index} className="flex gap-4 items-start group">
                    <div className={`mt-0.5 px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded-md shrink-0 ${badgeColor}`}>
                      {act.type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 group-hover:text-white transition-colors break-words">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                        {new Date(act.createdAt).toLocaleString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">
                No recent system activity detected.
              </div>
            )}
          </div>
        </div>

        {/* Info / Quick Moderator Checklist */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5 mb-6">
              <div className="p-2 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white leading-tight">Moderation Standards</h4>
                <p className="text-xs text-slate-500">Security code of conduct policies</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Spam Purging</h5>
                <p className="text-xs text-slate-400 leading-relaxed">Regularly monitor text notes and PDF uploads. Use "Purge" to clean documents that violate code standards.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Flag Auditing</h5>
                <p className="text-xs text-slate-400 leading-relaxed">Address all pending flags in the Report queue. Once reviewed, mark reports as resolved to automatically resolve target statuses.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Block Restrict</h5>
                <p className="text-xs text-slate-400 leading-relaxed">Temporary or permanently block accounts reporting repeated malicious behavior, disabling their login scopes.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 block">StudyHub Security Suite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
