'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  GraduationCap,
  FileText,
  MessageSquare,
  Search,
  Plus,
  Upload,
  Send,
  User,
  Clock,
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
  Check,
  Calendar,
  Lock,
  Flag
} from 'lucide-react';

export default function CommunityHubPage() {
  const { user, loading: authLoading } = useAuth();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'chat'

  // Public Notes board states
  const [publicNotes, setPublicNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [notesLoading, setNotesLoading] = useState(true);

  // Community Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Public Note creation modal states
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showUploadNoteModal, setShowUploadNoteModal] = useState(false);
  
  // Content reporting states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingType, setReportingType] = useState('note'); // 'note' | 'user'
  const [reportedTargetUser, setReportedTargetUser] = useState({ id: '', name: '' });
  
  // Note Form states
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // Form feedback alerts
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Fetch all public notes
  const fetchPublicNotes = async (query = '') => {
    setNotesLoading(true);
    try {
      const url = query ? `/api/public/notes?q=${encodeURIComponent(query)}` : '/api/public/notes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPublicNotes(data.notes || []);
        
        // Retain selected reference
        if (selectedNote) {
          const updated = data.notes.find(n => n.id === selectedNote.id);
          setSelectedNote(updated || null);
        }
      }
    } catch (err) {
      console.error('Error fetching public notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicNotes();
  }, []);

  const handleNotesSearch = (e) => {
    const val = e.target.value;
    setNotesSearchQuery(val);
    fetchPublicNotes(val);
  };

  // 2. Fetch community chat historical messages
  const fetchCommunityMessages = async () => {
    if (!user) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/community/messages');
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching community messages:', err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCommunityMessages();
    }
  }, [user]);

  // 3. Manage real-time community chat sockets
  useEffect(() => {
    if (!user) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setSocketConnected(true);
      socketRef.current.emit('register', user.id);
    });

    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
    });

    socketRef.current.on('receive_community_message', (msg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, activeTab]);

  // 4. Send Community Message via Sockets
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || !user || !socketConnected) return;

    const payload = {
      senderId: user.id,
      content: chatInputText.trim()
    };

    socketRef.current.emit('send_community_message', payload);
    setChatInputText('');
  };

  // 5. Create Plain Text Note
  const handleCreateTextNote = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!noteTitle.trim()) {
      setFormError('Please enter a note title.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/public/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteTitle, content: noteContent }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish note.');
      }

      setFormSuccess('Note published to public board successfully!');
      setNoteTitle('');
      setNoteContent('');
      await fetchPublicNotes(notesSearchQuery);

      if (data.note) {
        setSelectedNote(data.note);
      }

      setTimeout(() => {
        setShowCreateNoteModal(false);
        setFormSuccess('');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 6. Upload PDF Note
  const handleUploadPDFNote = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!uploadFile) {
      setFormError('Please select a PDF file to upload.');
      setFormLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('file', uploadFile);

      const res = await fetch('/api/public/notes', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload public note.');
      }

      setFormSuccess('Public PDF note uploaded successfully!');
      setUploadTitle('');
      setUploadFile(null);

      const fileInput = document.getElementById('public-file-upload-input');
      if (fileInput) fileInput.value = '';

      await fetchPublicNotes(notesSearchQuery);

      if (data.note) {
        setSelectedNote(data.note);
      }

      setTimeout(() => {
        setShowUploadNoteModal(false);
        setFormSuccess('');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 7. Report Public Note to Administrators
  const handleReportNote = async (e) => {
    e.preventDefault();
    if (!reportReason.trim() || !user || !selectedNote) return;
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedNoteId: selectedNote.id,
          reason: reportReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

      setFormSuccess('Thank you. Content flagged and reported to system administrators.');
      setReportReason('');

      // Refresh list to pull updated moderation Status
      await fetchPublicNotes(notesSearchQuery);
      
      // Keep selectedNote status updated locally to show banner
      setSelectedNote({
        ...selectedNote,
        moderationStatus: 'flagged'
      });

      setTimeout(() => {
        setShowReportModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 7.5 Report Student User to Administrators
  const handleReportUserSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim() || !user || !reportedTargetUser.id) return;
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: reportedTargetUser.id,
          reason: reportReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit user report.');

      setFormSuccess('Thank you. Student reported successfully to system administrators.');
      setReportReason('');

      setTimeout(() => {
        setShowReportModal(false);
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

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background soft glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[180px] pointer-events-none" />

      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={user ? '/dashboard' : '/'}
              className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-500/15">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Community Hub
              </span>
            </div>
          </div>

          {/* User badge or Auth controls */}
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-350 hover:text-white text-xs font-semibold transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold transition-all duration-200"
                >
                  Join Hub
                </Link>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <User className="h-3.5 w-3.5 text-violet-400" />
                <span className="font-bold">{user.name || user.email.split('@')[0]}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Sub-Tabs bar */}
      <section className="border-b border-slate-900/80 bg-slate-950/40 sticky top-[73px] z-20 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-slate-850">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-slate-950 text-white shadow-sm border border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Public Notes Board</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-slate-950 text-white shadow-sm border border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Global Community Chat</span>
            </button>
          </div>

          {/* Quick Publish controls (Only show on Notes Tab if authenticated) */}
          {activeTab === 'notes' && user && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateNoteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-violet-400" />
                <span>Write Note</span>
              </button>
              <button
                onClick={() => setShowUploadNoteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload PDF</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Workspace viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-8 overflow-hidden">
        
        {/* VIEW 1: PUBLIC NOTES VIEWPORT */}
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden w-full h-[70vh]">
            
            {/* Notes Roster List Column */}
            <section className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4 h-full">
              {/* Note Search Input */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 relative">
                <Search className="absolute left-7 top-7 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={notesSearchQuery}
                  onChange={handleNotesSearch}
                  placeholder="Search public notes..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-xs"
                />
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {notesLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                    <span className="text-xs">Loading public board...</span>
                  </div>
                ) : publicNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl bg-slate-900/20 border border-slate-900 border-dashed">
                    <FileText className="h-8 w-8 text-slate-700 mb-2" />
                    <p className="text-xs font-bold text-slate-400">No public notes found</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                      {notesSearchQuery ? 'Try matching alternative keywords.' : 'Be the first to publish a public note to the hub!'}
                    </p>
                  </div>
                ) : (
                  publicNotes.map((note) => {
                    const isSelected = selectedNote?.id === note.id;
                    const isPdf = !!note.pdfUrl;
                    return (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 select-none ${
                          isSelected
                            ? 'bg-slate-900 border-violet-500/40 shadow-lg shadow-violet-500/5 text-white'
                            : 'bg-slate-900/20 hover:bg-slate-900/50 border-slate-900 hover:border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs line-clamp-1">{note.title}</h4>
                          <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1 rounded ${
                            isPdf 
                              ? 'text-red-400 bg-red-950/40 border border-red-900/25' 
                              : 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/25'
                          }`}>
                            {isPdf ? 'PDF' : 'TXT'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-450 line-clamp-2 leading-relaxed">
                          {isPdf ? 'Uploaded public resource document.' : note.content}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-950/40 text-[9px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(note.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-slate-400 truncate max-w-[120px]">
                            <User className="h-2.5 w-2.5 text-violet-400" />
                            <span className="truncate">{note.user?.name || note.user?.email.split('@')[0]}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Note Reader Workspace Column */}
            <section className="flex-1 min-w-0 flex flex-col h-full">
              {!selectedNote ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-slate-900/10 border border-slate-900/60 h-full">
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 mb-3 text-slate-500">
                    <FileText className="h-8 w-8 text-slate-450" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Public Note Panel</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Select any public note card on the left panel to load, review, and preview its contents.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl h-full relative overflow-hidden">
                  
                  {/* Note header details */}
                  <div className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-white">{selectedNote.title}</h3>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          selectedNote.pdfUrl 
                            ? 'text-red-400 bg-red-950/40 border border-red-900/30' 
                            : 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/30'
                        }`}>
                          {selectedNote.pdfUrl ? 'PDF File' : 'Plain Text'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-slate-450">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Published {formatDate(selectedNote.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-violet-400" />
                          Author: <strong className="text-slate-350">{selectedNote.user?.name || selectedNote.user?.email}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Report action button */}
                    {user && selectedNote.userId !== user.id && (
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedNote.moderationStatus === 'flagged' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-900/40 bg-red-950/20 text-red-450 text-[10px] font-bold select-none">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span>Reported</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowReportModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/40 hover:border-red-900/80 bg-red-950/15 hover:bg-red-950/30 text-red-400 hover:text-red-300 text-[10px] font-bold transition cursor-pointer"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span>Report Note</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Note Reader Body */}
                  <div className="flex-1 overflow-y-auto pt-6 pr-1 custom-scrollbar">
                    {selectedNote.moderationStatus === 'flagged' && (
                      <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-red-350 text-[11px] leading-relaxed">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>This document has been flagged by students for moderation. System administrators are actively reviewing it.</span>
                      </div>
                    )}
                    {selectedNote.pdfUrl ? (
                      <div className="space-y-4 h-full flex flex-col">
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-850 shrink-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-4.5 w-4.5 text-red-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{selectedNote.title}</span>
                          </div>
                          <a
                            href={selectedNote.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-[10px] font-bold border border-slate-800 transition"
                          >
                            Open Externally
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <div className="flex-1 min-h-[350px] border border-slate-850 rounded-2xl overflow-hidden bg-slate-950 relative">
                          <iframe
                            src={`${selectedNote.pdfUrl}#toolbar=1`}
                            className="absolute inset-0 w-full h-full border-none"
                            title={selectedNote.title}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-5.5 rounded-2xl bg-slate-950/60 border border-slate-850 shadow-inner">
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {selectedNote.content || 'No text contents logged inside this note.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: COMMUNITY CHAT VIEWPORT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-[70vh] w-full p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 overflow-hidden relative">
            
            {/* UNAUTHENTICATED OR LOGGED OUT MASK OVERLAY */}
            {!user ? (
              <div className="absolute inset-0 z-40 backdrop-blur-md bg-slate-950/70 flex flex-col items-center justify-center text-center p-8 space-y-6 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 shadow-xl relative">
                  <Lock className="h-8 w-8 text-violet-400" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </div>

                <div className="space-y-2 max-w-sm">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">🔒 Real-Time Community Chat</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Join students and classmates worldwide in a live unified dialogue space! Sign in to view ongoing streams and post messages.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/login?from=/community-hub"
                    className="px-6 py-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-900/80 text-white font-bold text-xs transition shadow-md"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-violet-500/10"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Chat Header details */}
            <div className="pb-3 border-b border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-950/50 border border-violet-900/30 text-violet-400">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">Global Unified Chatroom</p>
                  <p className="text-[9px] text-slate-500">Live chat for all active StudyHub students.</p>
                </div>
              </div>

              {/* Socket connectivity status tag */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                  {socketConnected ? 'Real-Time Synchronized' : 'Reconnecting...'}
                </span>
              </div>
            </div>

            {/* Message Stream thread */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1 custom-scrollbar">
              {chatLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                  <span className="text-xs">Loading dialogue history...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-650 gap-1.5">
                  <MessageSquare className="h-6 w-6 text-slate-700" />
                  <p className="text-xs">Unified space is empty.</p>
                  <p className="text-[9px] text-slate-650">Wave hello to spark the first community discussion!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCurrentUser = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-1 duration-150`}
                    >
                      <div className={`max-w-[75%] space-y-1 flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {/* Sender metadata info bubble */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-violet-400 px-1 truncate max-w-[150px] capitalize">
                              {msg.sender?.name || msg.sender?.email?.split('@')[0] || 'Classmate'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReportingType('user');
                                setReportedTargetUser({
                                  id: msg.senderId,
                                  name: msg.sender?.name || msg.sender?.email || 'Classmate'
                                });
                                setReportReason('');
                                setFormError('');
                                setFormSuccess('');
                                setShowReportModal(true);
                              }}
                              title="Report this user"
                              className="text-slate-600 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                            >
                              <Flag className="h-2.5 w-2.5 shrink-0" />
                            </button>
                          </div>
                        )}

                        <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                          isCurrentUser
                            ? 'bg-violet-600 text-white rounded-tr-sm shadow-md'
                            : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-sm'
                        }`}>
                          <p className="break-words font-sans">{msg.content}</p>
                        </div>

                        {/* Timing info */}
                        <div className="flex items-center gap-1 text-[8px] text-slate-500 font-bold uppercase tracking-wider px-1">
                          <Clock className="h-2 w-2" />
                          <span>{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input Send Form */}
            <div className="pt-4 border-t border-slate-850 shrink-0">
              <form onSubmit={handleSendChatMessage} className="flex gap-3">
                <input
                  type="text"
                  required
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder={
                    socketConnected
                      ? "Write a message to everyone here..."
                      : "Connecting to sync server..."
                  }
                  disabled={!socketConnected}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition text-xs disabled:opacity-40"
                />

                <button
                  type="submit"
                  disabled={!socketConnected || !chatInputText.trim()}
                  className="flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold transition shadow-md shadow-violet-500/10 disabled:opacity-30 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* --- MODAL 1: WRITE PUBLIC TEXT NOTE --- */}
      {showCreateNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setShowCreateNoteModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-violet-500" />
                Publish Public Text Note
              </h3>
              <p className="text-[11px] text-slate-400">This note will be visible instantly to anyone visiting the Public Hub.</p>
            </div>

            <form onSubmit={handleCreateTextNote} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-[11px]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-[11px]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Note Title *</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Calculus Derivatives Cheat Sheet"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Note Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write or copy-paste public learning content here..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition text-xs resize-y font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-500/10 transition cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish Note'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: UPLOAD PUBLIC PDF NOTE --- */}
      {showUploadNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setShowUploadNoteModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Upload className="h-4.5 w-4.5 text-violet-500" />
                Upload Public PDF Document
              </h3>
              <p className="text-[11px] text-slate-400">Share complete PDF study materials, files, or reports with everyone.</p>
            </div>

            <form onSubmit={handleUploadPDFNote} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-[11px]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-[11px]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Document Title (Optional)</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Defaults to select file name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select File *</label>
                <div className="w-full p-6 rounded-2xl bg-slate-950 border-2 border-slate-850 hover:border-slate-700 border-dashed transition flex flex-col items-center justify-center text-center relative group">
                  <input
                    id="public-file-upload-input"
                    type="file"
                    required
                    accept=".pdf"
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-6 w-6 text-slate-500 group-hover:text-violet-400 transition mb-2 shrink-0" />
                  
                  {uploadFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white max-w-[280px] truncate">{uploadFile.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-300">Click or drag PDF slides here</p>
                      <p className="text-[9px] text-slate-500">Supports PDF files up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-500/10 transition cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload Document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: REPORT/FLAG NOTE OR USER --- */}
      {showReportModal && (reportingType === 'note' ? selectedNote : reportedTargetUser.id) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => { setShowReportModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                {reportingType === 'note' ? 'Report Public Note' : 'Report Student User'}
              </h3>
              <p className="text-[11px] text-slate-450">
                {reportingType === 'note' 
                  ? `Please explain the reason for flagging "${selectedNote.title}" for administrator review.`
                  : `Please explain the reason for reporting "${reportedTargetUser.name}" for administrator review.`
                }
              </p>
            </div>

            <form onSubmit={reportingType === 'note' ? handleReportNote : handleReportUserSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-[11px]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-[11px]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reason for report *</label>
                <textarea
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder={
                    reportingType === 'note'
                      ? "e.g. Contains spam advertising, offensive remarks, or incorrect academic content..."
                      : "e.g. Offensive comments, abusive behavior in community channels, spamming, etc..."
                  }
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-xs font-sans resize-y"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setFormError(''); }}
                  className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !reportReason.trim()}
                  className="px-4 py-2.5 bg-red-650 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900/50 py-5 text-center z-10 shrink-0">
        <p className="text-[10px] text-slate-500">
          StudyHub Community Hub - Collaboration and open access for students.
        </p>
      </footer>
    </div>
  );
}
