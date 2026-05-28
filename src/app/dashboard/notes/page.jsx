'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Search,
  Plus,
  Upload,
  Share2,
  Trash2,
  FileText,
  Clock,
  User,
  Mail,
  X,
  GraduationCap,
  Calendar,
  Sparkles,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';

export default function NotesHubPage() {
  const { user } = useAuth();
  
  // Platform notes list states
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('my-notes'); // 'my-notes' | 'shared'
  const [loading, setLoading] = useState(true);

  // Modals visibility toggles
  const [showCreateTextModal, setShowCreateTextModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sharingNote, setSharingNote] = useState(null); // stores note object when sharing

  // Form input fields
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  
  const [shareEmail, setShareEmail] = useState('');

  // Status feedback states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 1. Fetch notes list
  const fetchNotes = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/api/notes?q=${encodeURIComponent(query)}` : '/api/notes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        
        // Retain selected note reference if it still exists
        if (selectedNote) {
          const updatedSelected = data.notes.find(n => n.id === selectedNote.id);
          setSelectedNote(updatedSelected || null);
        }
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Handle live search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchNotes(val);
  };

  // Filter notes based on active tab ('my-notes' -> created by user, 'shared' -> shared with user)
  const filteredNotes = notes.filter(note => {
    if (activeTab === 'my-notes') {
      return note.userId === user?.id;
    } else {
      return note.userId !== user?.id;
    }
  });

  // 2. Handle Plain Text creation
  const handleCreateTextNote = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!textTitle.trim()) {
      setFormError('Please enter a note title.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: textTitle, content: textContent }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create note.');
      }

      setFormSuccess('Plain text note created successfully!');
      setTextTitle('');
      setTextContent('');
      await fetchNotes(searchQuery);
      
      // Auto-select the newly created note
      if (data.note) {
        setSelectedNote(data.note);
      }

      setTimeout(() => {
        setShowCreateTextModal(false);
        setFormSuccess('');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 3. Handle PDF file upload
  const handleUploadNote = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!uploadFile) {
      setFormError('Please select a PDF or text file to upload.');
      setFormLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('file', uploadFile);

      const res = await fetch('/api/notes', {
        method: 'POST',
        body: formData, // Automatically sets correct multipart header
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload note.');
      }

      setFormSuccess('Note uploaded successfully!');
      setUploadTitle('');
      setUploadFile(null);
      
      // Clear file input manually
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';

      await fetchNotes(searchQuery);

      if (data.note) {
        setSelectedNote(data.note);
      }

      setTimeout(() => {
        setShowUploadModal(false);
        setFormSuccess('');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 4. Handle note delete
  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note? This action is permanent.')) {
      return;
    }

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
        await fetchNotes(searchQuery);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete note.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // 5. Handle note sharing
  const handleShareNote = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!shareEmail.trim()) {
      setFormError('Please enter a classmate email address.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/notes/${sharingNote.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to share note.');
      }

      setFormSuccess(`Note successfully shared with ${shareEmail}!`);
      setShareEmail('');
      await fetchNotes(searchQuery);

      setTimeout(() => {
        setSharingNote(null);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Dynamic radial glow backgrounds */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[180px] pointer-events-none" />

      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-md shadow-blue-500/15">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Notes Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateTextModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Write Note</span>
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold shadow-md shadow-blue-500/15 transition-all duration-200 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Note</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace split screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 z-10 overflow-hidden">
        
        {/* Left column: Searches, tabs, and lists */}
        <section className="w-full lg:w-[400px] flex flex-col shrink-0 gap-6">
          
          {/* Searching and Tabs wrapper */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search notes by title/keyword..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-850 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
              />
            </div>

            {/* Toggle tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-900">
              <button
                onClick={() => { setActiveTab('my-notes'); setSelectedNote(null); }}
                className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeTab === 'my-notes'
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Notes
              </button>
              <button
                onClick={() => { setActiveTab('shared'); setSelectedNote(null); }}
                className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeTab === 'shared'
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Shared with Me
              </button>
            </div>
          </div>

          {/* Dynamic Scrollable note list */}
          <div className="flex-1 min-h-[300px] lg:min-h-0 overflow-y-auto max-h-[500px] lg:max-h-[60vh] space-y-3 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Loading repository...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl bg-slate-900/20 border border-slate-900 border-dashed">
                <FileText className="h-10 w-10 text-slate-650 mb-3" />
                <p className="text-sm font-bold text-slate-350">No notes found</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  {searchQuery 
                    ? 'Refine your query keyword search.'
                    : activeTab === 'my-notes'
                      ? 'Write a plain text note or upload your PDF lecture slides to get started.'
                      : 'Notes shared with your email by classmates will display here.'
                  }
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                const isPdf = !!note.pdfUrl;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`group relative p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 select-none ${
                      isSelected
                        ? 'bg-slate-900 border-blue-500/40 shadow-lg shadow-blue-500/5'
                        : 'bg-slate-900/30 hover:bg-slate-900/60 border-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-bold text-sm tracking-tight transition-colors line-clamp-1 ${
                          isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                        }`}>
                          {note.title}
                        </h4>
                        
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isPdf 
                            ? 'text-red-400 bg-red-950/40 border border-red-900/30' 
                            : 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/30'
                        }`}>
                          {isPdf ? 'PDF' : 'Text'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {isPdf ? 'Uploaded document slides or notes file.' : note.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-950/60 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{formatDate(note.updatedAt)}</span>
                      </div>
                      
                      {activeTab === 'shared' && (
                        <div className="flex items-center gap-1 text-blue-400 max-w-[120px] truncate">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{note.user?.name || note.user?.email.split('@')[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick actions for Owned Notes */}
                    {activeTab === 'my-notes' && (
                      <div className="absolute right-3.5 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSharingNote(note); }}
                          title="Share note"
                          className="p-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-blue-400 transition-all cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                          title="Delete note"
                          className="p-1.5 rounded-lg border border-slate-850 hover:border-red-950 bg-slate-950 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right column: Active note detailed view */}
        <section className="flex-1 min-w-0 flex flex-col">
          {!selectedNote ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-slate-900/10 border border-slate-900/60">
              <div className="p-4.5 rounded-2xl bg-slate-900/40 border border-slate-850 mb-4 text-slate-500">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide">Workspace Reader Panel</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                Select a document or text note from the sidebar workspace to display its details, inspect content files, or share.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl relative">
              
              {/* Workspace Header details */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">{selectedNote.title}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      selectedNote.pdfUrl 
                        ? 'text-red-400 bg-red-950/40 border border-red-900/30' 
                        : 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/30'
                    }`}>
                      {selectedNote.pdfUrl ? 'PDF Document' : 'Plain Text'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-450">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>Updated {formatDate(selectedNote.updatedAt)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        Created by:{' '}
                        <strong className="text-slate-350">
                          {selectedNote.userId === user?.id 
                            ? 'You (Owner)' 
                            : selectedNote.user?.name || selectedNote.user?.email
                          }
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reader actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedNote.userId === user?.id && (
                    <>
                      <button
                        onClick={() => setSharingNote(selectedNote)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-blue-400 text-xs font-bold transition-all duration-200 cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share Note</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteNote(selectedNote.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-850 hover:border-red-950 bg-slate-950 text-slate-300 hover:text-red-400 text-xs font-bold transition-all duration-200 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Reader Contents */}
              <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1">
                {selectedNote.pdfUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-850">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-950/40 border border-red-900/30 text-red-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">PDF Reference</p>
                          <p className="text-sm font-bold text-white line-clamp-1">{selectedNote.title}</p>
                        </div>
                      </div>
                      <a
                        href={selectedNote.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold transition-all duration-200 border border-slate-800"
                      >
                        Open Externally
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* PDF iframe viewer */}
                    <div className="w-full aspect-[4/3] min-h-[400px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 relative">
                      <iframe
                        src={`${selectedNote.pdfUrl}#toolbar=1`}
                        className="absolute inset-0 w-full h-full border-none"
                        title={selectedNote.title}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-850 shadow-inner">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedNote.content || 'This note contains no written text content.'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </section>

      </main>

      {/* --- MODAL 1: CREATE TEXT NOTE --- */}
      {showCreateTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setShowCreateTextModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Write Plain Text Note
              </h3>
              <p className="text-xs text-slate-400">Pencil down structured key takeaways or custom lecture lists.</p>
            </div>

            <form onSubmit={handleCreateTextNote} className="space-y-5">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-xs">
                  <Check className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note Title *</label>
                <input
                  type="text"
                  required
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="e.g. CS101 Lecture 1 Recap"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
                />
              </div>

              {/* Content textarea */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note Content</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type or paste your academic note contents here..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm font-sans resize-y"
                />
              </div>

              {/* Trigger button */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md shadow-blue-500/15 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Create Note'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: UPLOAD NOTE FILE --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setShowUploadModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-500" />
                Upload Note Document
              </h3>
              <p className="text-xs text-slate-400">Save lecture slides, study syllabus guides, or external PDFs.</p>
            </div>

            <form onSubmit={handleUploadNote} className="space-y-5">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-xs">
                  <Check className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Title (Optional)</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Defaults to uploaded file name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
                />
              </div>

              {/* File selector area */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose File *</label>
                <div className="w-full p-6 rounded-2xl bg-slate-950 border-2 border-slate-850 hover:border-slate-700 border-dashed transition-colors flex flex-col items-center justify-center text-center relative group">
                  <input
                    id="file-upload-input"
                    type="file"
                    required
                    accept=".pdf,text/plain"
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-8 w-8 text-slate-550 group-hover:text-blue-400 transition-colors mb-3 shrink-0" />
                  
                  {uploadFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white max-w-[300px] truncate">{uploadFile.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-300">Click or drag note files here</p>
                      <p className="text-[10px] text-slate-500">Supports PDF or plain TXT files (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Trigger button */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md shadow-blue-500/15 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Upload Document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: SHARE NOTE WITH peer --- */}
      {sharingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setSharingNote(null); setShareEmail(''); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-500" />
                Share Document
              </h3>
              <p className="text-xs text-slate-400">Share "{sharingNote.title}" with a classmate by email.</p>
            </div>

            <form onSubmit={handleShareNote} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-xs">
                  <Check className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Email Address input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classmate Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="partner@school.edu"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              {/* Submit Share */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md shadow-blue-500/15 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Confirm Share'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
