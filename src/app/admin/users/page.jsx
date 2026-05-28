'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  Shield, 
  Lock, 
  Unlock, 
  Trash2, 
  Check, 
  X,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'delete' | 'block' | 'unblock' | 'role', user: object }
  const [inspectUser, setInspectUser] = useState(null); // detailed user details from API
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchUsers = async (query = '') => {
    try {
      const url = query ? `/api/admin/users?search=${encodeURIComponent(query)}` : '/api/admin/users';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to retrieve user rosters.');
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchUsers(search);
  };

  const handleClearSearch = () => {
    setSearch('');
    setLoading(true);
    fetchUsers('');
  };

  const handleInspectUser = async (userId) => {
    setInspectLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to retrieve detailed profile history.');
      const data = await res.json();
      setInspectUser(data.user);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setInspectLoading(false);
    }
  };

  const handlePerformAction = async () => {
    if (!confirmModal) return;
    const { type, user } = confirmModal;
    setConfirmModal(null);
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (type === 'delete') {
        const res = await fetch(`/api/admin/users?userId=${user.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete user.');
        setSuccess(`Successfully deleted user: ${user.email}`);
        if (inspectUser && inspectUser.id === user.id) setInspectUser(null);
      } else {
        let action = '';
        let role = undefined;
        if (type === 'block') action = 'block';
        if (type === 'unblock') action = 'unblock';
        if (type === 'role') {
          action = 'set_role';
          role = user.role === 'admin' ? 'user' : 'admin';
        }

        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action, role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user.');
        
        const actionVerb = type === 'role' ? 'role changed to ' + role : type + 'ed';
        setSuccess(`Successfully ${actionVerb} user: ${user.email}`);
        if (inspectUser && inspectUser.id === user.id) {
          handleInspectUser(user.id);
        }
      }
      // Re-fetch users list
      fetchUsers(search);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Loading inspector overlay */}
      {inspectLoading && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <div className="w-10 h-10 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold">Retrieving Student Audit Log...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Manage Student Directory</h2>
          <p className="text-sm text-slate-400 mt-1">Audit student rosters, modify security access levels, or suspend accounts.</p>
        </div>
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

      {/* Search and filter toolbar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search students by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-24 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 text-sm text-slate-200 placeholder-slate-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-20 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-500/10 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table grid */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">User Details</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role Authority</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Metrics</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Age</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspension Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Moderator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-sm">
                    <div className="w-8 h-8 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Refreshing directories...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-950/20 transition-colors">
                    {/* User profile details */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          item.role === 'admin' 
                            ? 'bg-violet-600/10 border border-violet-500/30 text-violet-400' 
                            : 'bg-slate-800 border border-slate-700 text-slate-300'
                        }`}>
                          {item.name ? item.name[0].toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleInspectUser(item.id)}
                              className="text-sm font-semibold text-white hover:text-violet-300 transition-colors text-left focus:outline-none cursor-pointer block truncate"
                            >
                              {item.name || 'Anonymous Student'}
                            </button>
                            {item._count.reportsReceived >= 3 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-950/80 border border-red-850/60 text-[9px] font-extrabold uppercase text-red-400 animate-pulse tracking-wide shrink-0">
                                ⚠️ High Risk ({item._count.reportsReceived} Reports)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{item.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Authority Badge */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${
                          item.role === 'admin' 
                            ? 'bg-violet-950/40 border-violet-850/50 text-violet-300' 
                            : 'bg-slate-950/40 border-slate-850/50 text-slate-400'
                        }`}>
                          {item.role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 text-violet-400" />
                              Administrator
                            </>
                          ) : (
                            <>
                              <Users className="h-3 w-3 text-slate-500" />
                              Standard User
                            </>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Storage Metrics */}
                    <td className="py-4.5 px-6">
                      <div className="text-slate-300 text-xs font-semibold flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                          {item._count.notes} Notes
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>{item._count.pdfUploads} PDFs</span>
                      </div>
                    </td>

                    {/* Account Age */}
                    <td className="py-4.5 px-6 text-xs font-medium text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>

                    {/* Block Status */}
                    <td className="py-4.5 px-6">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        item.isBlocked 
                          ? 'bg-red-950/60 border border-red-800/40 text-red-400' 
                          : 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400'
                      }`}>
                        {item.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    {/* Actions Panel */}
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Switch Role */}
                        <button
                          title="Toggle Admin Privilege"
                          onClick={() => setConfirmModal({ type: 'role', user: item })}
                          disabled={actionLoading}
                          className="p-2 bg-slate-950/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>

                        {/* Block/Unblock */}
                        <button
                          title={item.isBlocked ? 'Unblock Student' : 'Suspend Student'}
                          onClick={() => setConfirmModal({ type: item.isBlocked ? 'unblock' : 'block', user: item })}
                          disabled={actionLoading}
                          className={`p-2 border rounded-lg transition-all cursor-pointer ${
                            item.isBlocked 
                              ? 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-900/60 text-emerald-400 hover:text-emerald-300' 
                              : 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-900/60 text-amber-400 hover:text-amber-300'
                          }`}
                        >
                          {item.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>

                        {/* Delete User */}
                        <button
                          title="Purge User Account"
                          onClick={() => setConfirmModal({ type: 'delete', user: item })}
                          disabled={actionLoading}
                          className="p-2 bg-red-950/30 hover:bg-red-900/40 border-red-900/60 text-red-400 hover:text-red-300 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500 text-sm">
                    No student directories matched the search scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${
                confirmModal.type === 'delete' 
                  ? 'bg-red-950 border border-red-900 text-red-400' 
                  : confirmModal.type === 'block' 
                  ? 'bg-amber-950 border border-amber-900 text-amber-400' 
                  : 'bg-violet-950 border border-violet-900 text-violet-400'
              }`}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">
                  {confirmModal.type === 'delete' 
                    ? 'Confirm Purge Action' 
                    : confirmModal.type === 'block' 
                    ? 'Confirm Account Suspension' 
                    : confirmModal.type === 'unblock' 
                    ? 'Confirm Account Re-activation' 
                    : 'Modify Access Permissions'}
                </h4>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to perform this operation?
                </p>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mt-3 text-xs">
                  <span className="block font-semibold text-white">{confirmModal.user.name || 'Anonymous Student'}</span>
                  <span className="block text-slate-500 font-semibold">{confirmModal.user.email}</span>
                </div>
                {confirmModal.type === 'delete' && (
                  <p className="text-xs text-red-400 font-semibold mt-3">
                    Warning: Purging an account is final and deletes all notes, focus sessions, checklist logs, and documents.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePerformAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg text-white cursor-pointer ${
                  confirmModal.type === 'delete' 
                    ? 'bg-red-650 hover:bg-red-650/80 shadow-red-500/10' 
                    : confirmModal.type === 'block' 
                    ? 'bg-amber-650 hover:bg-amber-650/80 shadow-amber-500/10'
                    : 'bg-violet-650 hover:bg-violet-650/80 shadow-violet-500/10'
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Inspect Side Drawer Modal */}
      {inspectUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl p-8 overflow-y-auto space-y-8 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400">
                  {inspectUser.name ? inspectUser.name[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg leading-tight">{inspectUser.name || 'Anonymous Student'}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{inspectUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectUser(null)}
                className="p-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* General Profile Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Access Role</span>
                <span className="block text-sm font-semibold text-white mt-1 capitalize">{inspectUser.role}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Registered Since</span>
                <span className="block text-sm font-semibold text-white mt-1">
                  {new Date(inspectUser.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Active Complaints & Reports Section */}
            {inspectUser.reportsReceived && inspectUser.reportsReceived.length > 0 && (
              <div className="space-y-3 p-4 rounded-2xl bg-red-950/20 border border-red-900/40">
                <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Active Reports & Complaints ({inspectUser.reportsReceived.length})
                </h5>
                {inspectUser.reportsReceived.length >= 3 && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide bg-red-950/65 p-2 rounded-lg border border-red-800/40 animate-pulse">
                    ⚠️ ALERT: This student has been flagged 3+ times. Please review actions and complaints below.
                  </p>
                )}
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                  {inspectUser.reportsReceived.map((report) => (
                    <div key={report.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850/80 text-[11px] space-y-1">
                      <div className="flex justify-between items-center text-slate-555 font-bold text-[9px] uppercase tracking-wide">
                        <span>By: {report.reporter?.name || report.reporter?.email?.split('@')[0] || 'Student'}</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 italic font-medium leading-relaxed">"{report.reason}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Notes (Limit 5) */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-violet-400" />
                Recent Notes ({inspectUser.notes?.length || 0})
              </h5>
              <div className="space-y-2.5">
                {inspectUser.notes && inspectUser.notes.length > 0 ? (
                  inspectUser.notes.map((note) => (
                    <div key={note.id} className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block">{note.title}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Created: {new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border ${
                        note.isPublic 
                          ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' 
                          : 'bg-slate-950 border border-slate-800 text-slate-500'
                      }`}>
                        {note.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-650 italic text-center py-4">No text notes created yet.</p>
                )}
              </div>
            </div>

            {/* Recent PDF Uploads (Limit 5) */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-rose-400" />
                Recent PDF Uploads ({inspectUser.pdfUploads?.length || 0})
              </h5>
              <div className="space-y-2.5">
                {inspectUser.pdfUploads && inspectUser.pdfUploads.length > 0 ? (
                  inspectUser.pdfUploads.map((pdf) => (
                    <div key={pdf.id} className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block">{pdf.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Uploaded: {new Date(pdf.createdAt).toLocaleDateString()}</span>
                      </div>
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-red-950/40 border border-red-900/50 hover:bg-red-950/60 rounded text-[10px] font-bold text-red-400 transition-colors"
                      >
                        Open PDF
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-650 italic text-center py-4">No PDFs uploaded yet.</p>
                )}
              </div>
            </div>

            {/* Recent Quiz Sessions (Limit 5) */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                Recent Quiz Scores ({inspectUser.quizSessions?.length || 0})
              </h5>
              <div className="space-y-2.5">
                {inspectUser.quizSessions && inspectUser.quizSessions.length > 0 ? (
                  inspectUser.quizSessions.map((session) => (
                    <div key={session.id} className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block">{session.note?.title || 'Study Material'}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Taken: {new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">
                        Score: {session.score}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-650 italic text-center py-4">No practice quizzes completed yet.</p>
                )}
              </div>
            </div>

            {/* Account Quick Suspension Footer */}
            <div className="pt-6 border-t border-slate-800/80 flex justify-between items-center gap-4">
              <button
                type="button"
                onClick={() => setConfirmModal({ type: 'delete', user: inspectUser })}
                className="px-4 py-2.5 bg-red-950/30 border border-red-900/60 hover:bg-red-900/20 text-red-400 hover:text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex-1 text-center"
              >
                Delete Account
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal({ type: inspectUser.isBlocked ? 'unblock' : 'block', user: inspectUser })}
                className={`px-4 py-2.5 border text-xs font-bold rounded-xl transition-all cursor-pointer flex-1 text-center ${
                  inspectUser.isBlocked 
                    ? 'bg-emerald-955/30 border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/20' 
                    : 'bg-amber-955/30 border-amber-900/60 text-amber-400 hover:bg-amber-900/20'
                }`}
              >
                {inspectUser.isBlocked ? 'Activate Account' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
