'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Search, 
  Check, 
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';

export default function AdminNotesPage() {
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'notes', 'pdfs'
  const [filterFeatured, setFilterFeatured] = useState('all'); // 'all', 'featured', 'standard'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'flagged', 'reviewed', 'resolved', 'pending'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, title, type }
  const [previewItem, setPreviewItem] = useState(null); // unified item for preview

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/notes');
      if (!res.ok) throw new Error('Failed to retrieve contents.');
      const data = await res.json();
      
      // Merge notes and PDFs with unified fields
      const merged = [
        ...data.notes.map(n => ({
          ...n,
          contentType: 'note',
          displayName: n.title,
          ownerName: n.user?.name || 'Anonymous',
          ownerEmail: n.user?.email || 'N/A',
        })),
        ...data.pdfUploads.map(p => ({
          ...p,
          contentType: 'pdf',
          displayName: p.name,
          ownerName: p.user?.name || 'Anonymous',
          ownerEmail: p.user?.email || 'N/A',
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setItems(merged);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleState = async (item, action, currentValue) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.contentType,
          id: item.id,
          action,
          value: !currentValue
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update content state.');

      const verb = action === 'toggle_featured' 
        ? (!currentValue ? 'featured' : 'removed from featured')
        : (!currentValue ? 'hidden' : 'unhidden');
      
      setSuccess(`Successfully ${verb} ${item.contentType}: "${item.displayName}"`);
      if (previewItem && previewItem.id === item.id) {
        setPreviewItem({ ...previewItem, [action === 'toggle_featured' ? 'isFeatured' : 'isHidden']: !currentValue });
      }
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (item, status) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.contentType,
          id: item.id,
          action: 'set_status',
          value: status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update moderation status.');

      setSuccess(`Moderation status of "${item.displayName}" marked as: ${status.toUpperCase()}`);
      if (previewItem && previewItem.id === item.id) {
        setPreviewItem({ ...previewItem, moderationStatus: status });
      }
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDeleteItem = async () => {
    if (!confirmDelete) return;
    const { id, contentType, displayName } = confirmDelete;
    setConfirmDelete(null);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/notes?id=${id}&type=${contentType}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file.');

      setSuccess(`Purged unsafe ${contentType}: "${displayName}"`);
      if (previewItem && previewItem.id === id) setPreviewItem(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Filter items logic
  const filteredItems = items.filter(item => {
    // 1. Content type filter
    if (filterType !== 'all' && item.contentType !== filterType) return false;

    // 2. Featured filter
    if (filterFeatured === 'featured' && !item.isFeatured) return false;
    if (filterFeatured === 'standard' && item.isFeatured) return false;

    // 3. Moderation status filter
    if (filterStatus !== 'all' && item.moderationStatus !== filterStatus) return false;

    // 4. Search keyword filter
    if (search) {
      const query = search.toLowerCase();
      return (
        item.displayName.toLowerCase().includes(query) ||
        item.ownerName.toLowerCase().includes(query) ||
        item.ownerEmail.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Manage Study Content</h2>
        <p className="text-sm text-slate-400 mt-1">Audit uploaded learning materials, highlight exceptional guides, or remove spam files.</p>
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

      {/* Filter Options Toolbar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search content by title, subject, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 text-sm text-slate-200 placeholder-slate-500 transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Format filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-850">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer pr-4"
              >
                <option value="all">All Formats</option>
                <option value="note">Text Notes</option>
                <option value="pdf">PDF Uploads</option>
              </select>
            </div>

            {/* Featured filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-850">
              <Star className="h-3.5 w-3.5 text-slate-500" />
              <select 
                value={filterFeatured} 
                onChange={(e) => setFilterFeatured(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer pr-4"
              >
                <option value="all">All Visibility</option>
                <option value="featured">Featured Only</option>
                <option value="standard">Standard Only</option>
              </select>
            </div>

            {/* Moderation status filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-850">
              <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer pr-4"
              >
                <option value="all">All Moderation</option>
                <option value="pending">Pending</option>
                <option value="flagged">Flagged / Reported</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid List Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Content Title</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Format</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Owner</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created On</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Moderation</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-sm">
                    <div className="w-8 h-8 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Scanning server vaults...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.contentType + '-' + item.id} className="hover:bg-slate-950/20 transition-colors">
                    {/* Content Display Name */}
                    <td className="py-4.5 px-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="text-sm font-semibold text-white hover:text-violet-300 transition-colors text-left focus:outline-none cursor-pointer block truncate max-w-xs"
                          >
                            {item.displayName}
                          </button>
                          {item.isPublic && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 uppercase">
                              Public
                            </span>
                          )}
                          {item.isFeatured && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-950/60 border border-violet-850/50 text-violet-300 uppercase">
                              <Star className="h-2 w-2 text-violet-400 fill-violet-400" />
                              Featured
                            </span>
                          )}
                          {item.isHidden && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-950/60 border border-slate-800 text-slate-500 uppercase">
                              Hidden
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-600 font-semibold uppercase block">ID: {item.id}</span>
                      </div>
                    </td>

                    {/* Format Badge */}
                    <td className="py-4.5 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        item.contentType === 'pdf' 
                          ? 'bg-red-950/40 border-red-900/40 text-red-400' 
                          : 'bg-blue-950/40 border-blue-900/40 text-blue-400'
                      }`}>
                        {item.contentType === 'pdf' ? (
                          <>
                            <Upload className="h-3 w-3 text-red-500" />
                            PDF Upload
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 text-blue-500" />
                            Text Note
                          </>
                        )}
                      </span>
                    </td>

                    {/* Owner Details */}
                    <td className="py-4.5 px-6">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{item.ownerName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.ownerEmail}</p>
                      </div>
                    </td>

                    {/* Created On */}
                    <td className="py-4.5 px-6 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(item.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </td>

                    {/* Moderation Status */}
                    <td className="py-4.5 px-6">
                      <select
                        value={item.moderationStatus}
                        onChange={(e) => handleUpdateStatus(item, e.target.value)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-slate-950/80 focus:outline-none cursor-pointer ${
                          item.moderationStatus === 'flagged'
                            ? 'border-red-900 text-red-400 bg-red-950/20'
                            : item.moderationStatus === 'resolved'
                            ? 'border-emerald-900 text-emerald-400 bg-emerald-950/20'
                            : item.moderationStatus === 'reviewed'
                            ? 'border-blue-900 text-blue-400 bg-blue-950/20'
                            : 'border-slate-800 text-slate-400 bg-slate-900/40'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="flagged">🚨 Flagged</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>

                    {/* Actions Panel */}
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Featured */}
                        <button
                          title={item.isFeatured ? 'Remove Outstanding' : 'Feature Outstanding Guide'}
                          onClick={() => handleToggleState(item, 'toggle_featured', item.isFeatured)}
                          className={`p-2 border rounded-lg transition-all cursor-pointer ${
                            item.isFeatured 
                              ? 'bg-violet-950/40 border-violet-900 text-violet-400 hover:text-violet-300' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-200'
                          }`}
                        >
                          <Star className={`h-4 w-4 ${item.isFeatured ? 'fill-violet-400' : ''}`} />
                        </button>

                        {/* Toggle Hidden */}
                        <button
                          title={item.isHidden ? 'Make Public' : 'Hide from Public Directory'}
                          onClick={() => handleToggleState(item, 'toggle_hidden', item.isHidden)}
                          className={`p-2 border rounded-lg transition-all cursor-pointer ${
                            item.isHidden 
                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-200'
                          }`}
                        >
                          {item.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>

                        {/* Delete Content */}
                        <button
                          title="Purge content and assets"
                          onClick={() => setConfirmDelete(item)}
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
                    No files matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-950 border border-red-900 text-red-400 rounded-2xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Confirm Content Purge</h4>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete this content? Any associated files will be cleaned up.
                </p>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mt-3 text-xs">
                  <span className="block font-semibold text-white uppercase tracking-wider text-[9px] text-violet-400 mb-1">{confirmDelete.contentType}</span>
                  <span className="block font-bold text-slate-200">{confirmDelete.displayName}</span>
                  <span className="block text-slate-500 font-semibold mt-1">Uploaded by: {confirmDelete.ownerName}</span>
                </div>
                <p className="text-xs text-red-400 font-semibold mt-3">
                  Warning: Purging study content cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-2 bg-red-650 hover:bg-red-650/80 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-500/10 cursor-pointer"
              >
                Purge Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Content Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-3xl w-full h-[90vh] flex flex-col shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/85 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  previewItem.contentType === 'pdf' 
                    ? 'bg-red-955/25 border-red-900/40 text-red-400' 
                    : 'bg-blue-955/25 border-blue-900/40 text-blue-400'
                }`}>
                  {previewItem.contentType === 'pdf' ? <Upload className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg leading-tight">{previewItem.displayName}</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Author: {previewItem.ownerName} ({previewItem.ownerEmail})</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable View Area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {previewItem.contentType === 'note' && !previewItem.pdfUrl ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-850/80 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
                  {previewItem.content || <span className="text-slate-650 italic">This text note has no written content.</span>}
                </div>
              ) : (
                <div className="w-full h-full rounded-2xl border border-slate-850 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
                  {previewItem.url || previewItem.pdfUrl ? (
                    <iframe 
                      src={previewItem.url || previewItem.pdfUrl} 
                      className="w-full h-full border-0" 
                      title={previewItem.displayName}
                    />
                  ) : (
                    <span className="text-slate-500 text-xs italic">PDF document link is invalid.</span>
                  )}
                </div>
              )}
            </div>

            {/* Quick moderating panel in footer */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Moderator Quick Action:</span>
                <select
                  value={previewItem.moderationStatus}
                  onChange={(e) => handleUpdateStatus(previewItem, e.target.value)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-slate-950/80 focus:outline-none cursor-pointer ${
                    previewItem.moderationStatus === 'flagged'
                      ? 'border-red-900 text-red-400 bg-red-950/20'
                      : previewItem.moderationStatus === 'resolved'
                      ? 'border-emerald-900 text-emerald-400 bg-emerald-950/20'
                      : 'border-slate-800 text-slate-400 bg-slate-900/40'
                  }`}
                >
                  <option value="pending">Pending</option>
                  <option value="flagged">🚨 Flagged</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleState(previewItem, 'toggle_featured', previewItem.isFeatured)}
                  className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    previewItem.isFeatured 
                      ? 'bg-violet-955/20 border-violet-900 text-violet-400 hover:text-violet-300' 
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${previewItem.isFeatured ? 'fill-violet-400' : ''}`} />
                  {previewItem.isFeatured ? 'Featured' : 'Feature Content'}
                </button>
                <button
                  onClick={() => handleToggleState(previewItem, 'toggle_hidden', previewItem.isHidden)}
                  className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    previewItem.isHidden 
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white' 
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {previewItem.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {previewItem.isHidden ? 'Hidden' : 'Hide from Public'}
                </button>
                <button
                  onClick={() => {
                    setPreviewItem(null);
                    setConfirmDelete(previewItem);
                  }}
                  className="px-4 py-2 bg-red-950/30 hover:bg-red-900/40 border border-red-900/60 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Purge asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
