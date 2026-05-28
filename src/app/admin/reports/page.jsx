'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Check, 
  Trash2, 
  Clock, 
  X, 
  ExternalLink,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'reviewed', 'resolved'
  const [confirmDismiss, setConfirmDismiss] = useState(null); // report object

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) throw new Error('Failed to retrieve moderation reports.');
      const data = await res.json();
      setReports(data.reports);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId, status) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update report status.');

      setSuccess(`Report successfully marked as ${status.toUpperCase()}`);
      fetchReports();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDismissReport = async () => {
    if (!confirmDismiss) return;
    const { id } = confirmDismiss;
    setConfirmDismiss(null);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/reports?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss report.');

      setSuccess('Report dismissed and deleted successfully.');
      fetchReports();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Moderation & Reports Queue</h2>
        <p className="text-sm text-slate-400 mt-1">Audit content flagged by the student community, review safety infractions, and resolve issues.</p>
      </div>

      {/* Info Status Cards */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 text-sm animate-in fade-in duration-200">
          <Check className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Report Status filter:</span>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            {['all', 'pending', 'reviewed', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Table list */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reporter</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Flagged Target</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Infraction Reason</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Filed</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Review Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-sm">
                    <div className="w-8 h-8 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Retrieving ticket archives...
                  </td>
                </tr>
              ) : filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  // Determine what the target is
                  let targetType = 'Unknown';
                  let targetName = 'N/A';
                  let targetLink = '#';

                  if (report.reportedNote) {
                    targetType = 'Note';
                    targetName = `"${report.reportedNote.title}"`;
                    targetLink = `/admin/notes`;
                  } else if (report.reportedPdf) {
                    targetType = 'PDF Upload';
                    targetName = `"${report.reportedPdf.name}"`;
                    targetLink = `/admin/notes`;
                  } else if (report.reportedUser) {
                    targetType = 'Student Account';
                    targetName = report.reportedUser.name || report.reportedUser.email;
                    targetLink = `/admin/users`;
                  }

                  return (
                    <tr key={report.id} className="hover:bg-slate-950/20 transition-colors">
                      {/* Reporter */}
                      <td className="py-4.5 px-6">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{report.reporter?.name || 'Anonymous'}</p>
                          <p className="text-[10px] text-slate-500 truncate">{report.reporter?.email}</p>
                        </div>
                      </td>

                      {/* Reported Target */}
                      <td className="py-4.5 px-6">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase rounded border ${
                            targetType === 'Note' 
                              ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' 
                              : targetType === 'PDF Upload' 
                              ? 'bg-red-950/40 border-red-900/40 text-red-400' 
                              : 'bg-violet-950/40 border-violet-900/40 text-violet-400'
                          }`}>
                            {targetType}
                          </span>
                          <p className="text-xs font-semibold text-white mt-1 truncate max-w-xs">{targetName}</p>
                          <Link href={targetLink} className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors mt-0.5">
                            Inspect Target
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-start gap-2 max-w-sm">
                          <MessageSquare className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-300 break-words">{report.reason}</p>
                        </div>
                      </td>

                      {/* Date Filed */}
                      <td className="py-4.5 px-6 text-xs text-slate-400 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(report.createdAt).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${
                          report.status === 'resolved' 
                            ? 'bg-emerald-950/40 border-emerald-850/50 text-emerald-300' 
                            : report.status === 'reviewed' 
                            ? 'bg-blue-950/40 border-blue-850/50 text-blue-300' 
                            : 'bg-red-950/40 border-red-850/50 text-red-300'
                        }`}>
                          {report.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Resolution Actions */}
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Resolve Report */}
                          {report.status !== 'resolved' && (
                            <button
                              title="Resolve Flag"
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              className="p-2 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/60 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}

                          {/* Review Report */}
                          {report.status === 'pending' && (
                            <button
                              title="Mark Reviewed"
                              onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                              className="p-2 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-900/60 text-blue-400 hover:text-blue-300 rounded-lg transition-all cursor-pointer"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                          )}

                          {/* Dismiss Report (Delete) */}
                          <button
                            title="Dismiss Flag Ticket"
                            onClick={() => setConfirmDismiss(report)}
                            className="p-2 bg-red-950/30 hover:bg-red-900/40 border border-red-900/60 text-red-400 hover:text-red-300 rounded-lg transition-all cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500 text-sm">
                    No active tickets in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDismiss && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-950 border border-red-900 text-red-400 rounded-2xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Dismiss Report Flag</h4>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to dismiss and delete this report? The original flagged content will not be modified, and this ticket is permanently cleared.
                </p>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mt-3 text-xs space-y-1">
                  <span className="block font-semibold text-slate-500 uppercase tracking-widest text-[9px]">Report Reason</span>
                  <span className="block text-slate-200 italic">"{confirmDismiss.reason}"</span>
                  <span className="block text-slate-500 font-semibold mt-1">Submitted by: {confirmDismiss.reporter?.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDismiss(null)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDismissReport}
                className="px-4 py-2 bg-red-650 hover:bg-red-650/80 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-500/10 cursor-pointer"
              >
                Dismiss Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
