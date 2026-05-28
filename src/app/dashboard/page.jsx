'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Layers, 
  CheckSquare, 
  Timer, 
  MessageSquare, 
  LogOut, 
  User,
  Users,
  Send,
  Clock,
  Flag,
  AlertCircle,
  Check,
  X,
  Loader2,
  ListTodo,
  Settings
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout, verifySession, loading: authLoading } = useAuth();

  // Socket community chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Student reporting modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportedTargetUser, setReportedTargetUser] = useState({ id: '', name: '' });
  const [reportFormLoading, setReportFormLoading] = useState(false);
  const [reportFormError, setReportFormError] = useState('');
  const [reportFormSuccess, setReportFormSuccess] = useState('');

  // Settings modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsTheme, setSettingsTheme] = useState('dark');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  // 1. Fetch historical community messages
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
      console.error('Error fetching dashboard community messages:', err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCommunityMessages();
    }
  }, [user]);

  // 2. Connect live community chat sockets
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
    scrollToBottom();
  }, [chatMessages]);

  // 3. Send community message
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

  // 4. Submit user report from chat
  const handleReportUserSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim() || !user || !reportedTargetUser.id) return;
    setReportFormLoading(true);
    setReportFormError('');
    setReportFormSuccess('');

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
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

      setReportFormSuccess('Thank you. Student reported to administrators.');
      setReportReason('');

      setTimeout(() => {
        setShowReportModal(false);
        setReportFormSuccess('');
      }, 1500);
    } catch (err) {
      setReportFormError(err.message);
    } finally {
      setReportFormLoading(false);
    }
  };

  // 5. Update user settings and save theme preference
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (!settingsName.trim()) {
      setSettingsError('Display Name cannot be empty.');
      return;
    }

    setSettingsLoading(true);
    try {
      // Send PATCH profile to server
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      // Sync name in auth provider context
      verifySession({
        ...user,
        name: settingsName.trim()
      });

      // Save theme in localStorage and toggle DOM body class
      if (settingsTheme === 'light') {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }

      setSettingsSuccess('Settings successfully updated!');
      setTimeout(() => {
        setShowSettingsModal(false);
      }, 1000);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // 5.5 Delete Student Account from DB
  const handleDeleteAccount = async () => {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }

    setSettingsLoading(true);
    setSettingsError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account.');

      setSettingsSuccess('Account permanently deleted off StudyHub.');
      
      // Clear session context and redirect
      setTimeout(async () => {
        setShowSettingsModal(false);
        verifySession(null);
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      setSettingsError(err.message);
      setConfirmDeleteAccount(false);
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Synchronizing session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const academicTools = [
    {
      title: 'Notes Hub',
      desc: 'Create text study logs, upload PDF documents, and easily share them with classmates.',
      icon: FileText,
      color: 'from-blue-600 to-cyan-600 shadow-blue-500/10',
      href: '/dashboard/notes',
    },
    {
      title: 'Practice Tests',
      desc: 'Use Gemini AI to instantly generate high-quality multiple choice quizzes from your notes.',
      icon: Sparkles,
      color: 'from-violet-600 to-fuchsia-600 shadow-violet-500/10',
      href: '/dashboard/practice-tests',
    },
    {
      title: 'Flashcards Hub',
      desc: 'Study manual decks with circular 3D flip card visual effects, or use AI summaries.',
      icon: Layers,
      color: 'from-indigo-600 to-violet-600 shadow-indigo-500/10',
      href: '/dashboard/flashcards',
    },
    {
      title: 'To-Do Lists',
      desc: 'Create daily tasks or use the Gemini AI Study Planner to generate systematic schedules.',
      icon: CheckSquare,
      color: 'from-emerald-600 to-teal-600 shadow-emerald-500/10',
      href: '/dashboard/todos',
    },
    {
      title: 'Focus Timer',
      desc: 'Study with an active circular Pomodoro study clock and track complete logs history.',
      icon: Timer,
      color: 'from-amber-600 to-orange-600 shadow-amber-500/10',
      href: '/dashboard/focus-timer',
    },
    {
      title: 'Study Chat',
      desc: 'Discuss curriculum topics in private channels and share direct links to study notes.',
      icon: MessageSquare,
      color: 'from-rose-600 to-pink-600 shadow-rose-500/10',
      href: '/dashboard/chat',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background glow filters */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[180px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-500/15">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              StudyHub
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-850 text-xs font-bold text-slate-350">
              <User className="h-4.5 w-4.5 text-violet-400" />
              <span>{user.name || user.email}</span>
            </div>
            
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-900/40 hover:border-red-800 text-xs font-bold text-red-400 hover:text-red-300 transition"
              >
                Admin Panel
              </Link>
            )}

            {/* Profile Settings Toggle button */}
            <button
              onClick={() => {
                setSettingsName(user.name || '');
                setSettingsTheme(localStorage.getItem('theme') || 'dark');
                setSettingsError('');
                setSettingsSuccess('');
                setConfirmDeleteAccount(false);
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white font-semibold text-xs transition duration-200 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 hover:border-red-500/30 hover:bg-red-950/20 text-slate-300 hover:text-red-400 font-semibold text-sm transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 z-10 space-y-8">
        
        {/* Welcome Section */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 blur-2xl pointer-events-none" />
          <div className="space-y-2 max-w-3xl relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-850/50 text-[10px] font-bold uppercase tracking-wider text-violet-300">
              <BookOpen className="h-3.5 w-3.5" />
              Active Workspace
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {user.name || user.email.split('@')[0]}! 👋
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your comprehensive student workspace is fully operational. Share study guides, generate mock tests with Gemini, and collaborate in real-time.
            </p>
          </div>
        </div>

        {/* --- PREMIUM LIVE STUDY CHAT PANELS SECTION (WHATSAPP/DISCORD STYLE!) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main WhatsApp-style Live Chat Pane */}
          <div className="lg:col-span-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl flex flex-col h-[480px] overflow-hidden">
            
            {/* Chat Pane Header */}
            <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-850/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-400 shrink-0">
                  <Users className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Global Student Community Chat</h4>
                  <p className="text-[10px] text-slate-500">Live chat for all online classmates on StudyHub</p>
                </div>
              </div>

              {/* Status Dot */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[9px] text-slate-555 uppercase tracking-widest font-extrabold">
                  {socketConnected ? 'Live Connection' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Chat Thread Messages Stream */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 pr-2 custom-scrollbar bg-slate-950/20">
              {chatLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2.5 text-slate-650">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  <span className="text-xs">Fetching dialogue history...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-650 gap-2">
                  <MessageSquare className="h-6 w-6 text-slate-700" />
                  <p className="text-xs font-bold">Say hello to spark discussion!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCurrentUser = msg.senderId === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-1 duration-150`}
                    >
                      <div className={`max-w-[80%] space-y-1 flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {/* Classmate Sender Badge */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-violet-400 px-1 truncate max-w-[130px] capitalize">
                              {msg.sender?.name || msg.sender?.email?.split('@')[0] || 'Classmate'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReportedTargetUser({
                                  id: msg.senderId,
                                  name: msg.sender?.name || msg.sender?.email || 'Classmate'
                                });
                                setReportReason('');
                                setReportFormError('');
                                setReportFormSuccess('');
                                setShowReportModal(true);
                              }}
                              title="Report student"
                              className="text-slate-650 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
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

                        {/* Timing */}
                        <div className="flex items-center gap-1 text-[8px] text-slate-500 font-bold uppercase tracking-wider px-1">
                          <Clock className="h-2 w-2 text-slate-600" />
                          <span>{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission Bar */}
            <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-850/80 shrink-0">
              <form onSubmit={handleSendChatMessage} className="flex gap-3">
                <input
                  type="text"
                  required
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder={
                    socketConnected
                      ? "Directly write a message to classmates..."
                      : "Connecting to StudyHub socket system..."
                  }
                  disabled={!socketConnected}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 text-xs disabled:opacity-40"
                />

                <button
                  type="submit"
                  disabled={!socketConnected || !chatInputText.trim()}
                  className="flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold transition shadow-md shadow-violet-500/10 disabled:opacity-30 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Quick Roster & Community Workspace Panel */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl p-6 flex flex-col justify-between h-[480px]">
            <div className="space-y-5 flex-1 flex flex-col min-h-0">
              <div className="border-b border-slate-850/60 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4 text-emerald-400" />
                  Your Study workstation
                </h4>
                <p className="text-[10px] text-slate-500">Fast tracking modules and shortcuts</p>
              </div>

              {/* Roster / Status updates list */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                
                {/* Community shortcut link */}
                <Link
                  href="/community-hub"
                  className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 transition flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-600/10 border border-violet-500/30 text-violet-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Community Board</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Read public shared materials</span>
                    </div>
                  </div>
                  <Users className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition" />
                </Link>

                {/* To Do Shortcut */}
                <Link
                  href="/dashboard/todos"
                  className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 transition flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">AI Study Planner</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Generate daily checklists</span>
                    </div>
                  </div>
                  <CheckSquare className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition" />
                </Link>

                {/* Focus sessions logger */}
                <Link
                  href="/dashboard/focus-timer"
                  className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 transition flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-600/10 border border-amber-500/30 text-amber-400">
                      <Timer className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Pomodoro Timer</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Sustain learning intervals</span>
                    </div>
                  </div>
                  <Timer className="h-4 w-4 text-slate-600 group-hover:text-amber-400 transition animate-spin-slow" />
                </Link>
              </div>
            </div>

            {/* Quick overview metric */}
            <div className="pt-4 border-t border-slate-850/60 text-center shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">System Roster</span>
              <p className="text-xs text-slate-350 font-semibold mt-1">StudyHub platform is running locally</p>
            </div>
          </div>

        </div>

        {/* --- ACADEMIC WORKSPACE SUITE (BELOW THE CHAT HUB LIKE A REAL APP!) --- */}
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Academic Workspace Suite</h3>
            <p className="text-xs text-slate-500">Access core academic productivity and machine learning engines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {academicTools.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <Link 
                  key={idx}
                  href={feat.href}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/65 hover:border-slate-75 shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feat.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md text-violet-400 bg-violet-950/40 border border-violet-900/30">
                        Active
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors duration-200">
                        {feat.title}
                      </h4>
                      <p className="text-xs text-slate-455 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-slate-400 font-bold transition-colors duration-200">
                    <span>Enter Workspace</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0">&rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </main>

      {/* --- SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => { setShowSettingsModal(false); setSettingsError(''); setSettingsSuccess(''); setConfirmDeleteAccount(false); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-violet-400" />
                Workstation Settings
              </h3>
              <p className="text-[11px] text-slate-450">Customize your workspace credentials and styling preferences.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {settingsError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-[11px]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{settingsError}</span>
                </div>
              )}
              {settingsSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-[11px]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              {/* 1. Display Name Field */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Display Name *</label>
                <input
                  type="text"
                  required
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition duration-200"
                />
              </div>

              {/* 2. Theme Selection Grid */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Theme Preference</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Dark Theme */}
                  <button
                    type="button"
                    onClick={() => setSettingsTheme('dark')}
                    className={`p-3 rounded-2xl border text-left transition relative select-none cursor-pointer flex flex-col justify-between h-20 ${
                      settingsTheme === 'dark'
                        ? 'bg-violet-955/20 border-violet-500/60 shadow-lg shadow-violet-500/5'
                        : 'bg-slate-955 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">🌌 Slate Dark</span>
                    <span className="text-[9px] text-slate-500 block">Sleek glassmorphism theme</span>
                    {settingsTheme === 'dark' && (
                      <Check className="absolute top-3 right-3 h-3.5 w-3.5 text-violet-400" />
                    )}
                  </button>

                  {/* Light Theme */}
                  <button
                    type="button"
                    onClick={() => setSettingsTheme('light')}
                    className={`p-3 rounded-2xl border text-left transition relative select-none cursor-pointer flex flex-col justify-between h-20 ${
                      settingsTheme === 'light'
                        ? 'bg-slate-100/10 border-slate-300 shadow-lg'
                        : 'bg-slate-955 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">☀️ Crystal Light</span>
                    <span className="text-[9px] text-slate-550 block">High-contrast light mode</span>
                    {settingsTheme === 'light' && (
                      <Check className="absolute top-3 right-3 h-3.5 w-3.5 text-violet-400" />
                    )}
                  </button>
                </div>
              </div>
                           {/* 3. Permanent Account Deletion Area */}
              <div className="space-y-3 pt-4 border-t border-slate-850/60">
                <label className="block text-[9px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Danger Zone
                </label>
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/35 space-y-3 text-left">
                  <p className="text-[10px] text-red-300 leading-relaxed font-semibold">
                    ⚠️ Deleting your account will permanently wipe all your notes, flashcards, todos, and chat details from the Database.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={settingsLoading}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition duration-200 cursor-pointer ${
                      confirmDeleteAccount
                        ? 'bg-red-650 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-red-950/40 hover:bg-red-950/60 border border-red-900/50 text-red-400'
                    }`}
                  >
                    {confirmDeleteAccount ? '⚠️ Click again to confirm permanent deletion' : 'Delete Account permanently'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850/60">
                <button
                  type="button"
                  onClick={() => { setShowSettingsModal(false); setSettingsError(''); setSettingsSuccess(''); setConfirmDeleteAccount(false); }}
                  className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-4 py-2.5 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-500/10 transition cursor-pointer disabled:opacity-40"
                >
                  {settingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Settings'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- REPORT/FLAG MODAL (INTEGRATED ON THE MAIN DASHBOARD!) --- */}
      {showReportModal && reportedTargetUser.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => { setShowReportModal(false); setReportFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                Report Student User
              </h3>
              <p className="text-[11px] text-slate-455">Please explain the reason for flagging "{reportedTargetUser.name}" for administrator review.</p>
            </div>

            <form onSubmit={handleReportUserSubmit} className="space-y-4">
              {reportFormError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-300 text-[11px]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{reportFormError}</span>
                </div>
              )}
              {reportFormSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-[11px]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{reportFormSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reason for report *</label>
                <textarea
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="e.g. Abusive remarks inside the main community dialogue stream, spam link spamming, etc..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-655 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-xs font-sans resize-y"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportFormError(''); }}
                  className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportFormLoading || !reportReason.trim()}
                  className="px-4 py-2.5 bg-red-650 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {reportFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900/50 py-6 text-center z-10 shrink-0">
        <p className="text-xs text-slate-500">
          StudyHub platform - Designed for Premium Student Productivity.
        </p>
      </footer>
    </div>
  );
}
