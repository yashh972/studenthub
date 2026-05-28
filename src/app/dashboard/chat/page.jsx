'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  GraduationCap,
  MessageSquare,
  Send,
  User,
  Paperclip,
  FileText,
  Clock,
  ExternalLink,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function StudyChatPage() {
  const { user } = useAuth();

  // Platform state lists
  const [classmates, setClassmates] = useState([]);
  const [notes, setNotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  // Loading indicators
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Message input state
  const [inputText, setInputText] = useState('');
  
  // Attachment popover state
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [attachedNote, setAttachedNote] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Fetch classmates roster and user's notes library
  const fetchSidebarData = async () => {
    setSidebarLoading(true);
    try {
      const [usersRes, notesRes] = await Promise.all([
        fetch('/api/chat/users'),
        fetch('/api/notes')
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setClassmates(usersData.classmates || []);
      }
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }
    } catch (err) {
      console.error('Error loading chat workspace lists:', err);
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    fetchSidebarData();
  }, []);

  // 2. Establish and manage Socket.IO Client connection
  useEffect(() => {
    if (!user) return;

    // Connect to standalone Socket.IO server running on Port 3001
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Successfully connected to Socket.IO Server!');
      setSocketConnected(true);
      
      // Register this user's ID to receive exclusive private messages
      socketRef.current.emit('register', user.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected.');
      setSocketConnected(false);
    });

    // Intercept incoming messages
    socketRef.current.on('receive_message', (message) => {
      // Append only if the message belongs to the active conversation thread
      setSelectedPartner(partner => {
        if (
          partner &&
          ((message.senderId === user.id && message.receiverId === partner.id) ||
           (message.senderId === partner.id && message.receiverId === user.id))
        ) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
        return partner;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  // Scroll to bottom of chat thread when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Fetch dialogue logs when selecting a classmate
  const handleSelectPartner = async (partner) => {
    setSelectedPartner(partner);
    setChatLoading(true);
    setMessages([]);
    setAttachedNote(null);
    setShowAttachmentDropdown(false);

    try {
      const res = await fetch(`/api/chat/messages?receiverId=${partner.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load persistent conversation history:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // 4. Send Message via WebSockets
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedNote) return;

    if (socketRef.current && socketConnected && selectedPartner) {
      // Formulate payload packet
      const messagePacket = {
        senderId: user.id,
        receiverId: selectedPartner.id,
        content: inputText.trim() || `Shared a note: ${attachedNote.title}`,
        noteLinkId: attachedNote ? attachedNote.id : null
      };

      // Emit package to Socket.IO server
      socketRef.current.emit('send_message', messagePacket);
      
      // Clean up fields
      setInputText('');
      setAttachedNote(null);
    } else {
      alert('Cannot send message. Sockets are offline. Please make sure the socket server is running on Port 3001.');
    }
  };

  const handleAttachNote = (note) => {
    setAttachedNote(note);
    setShowAttachmentDropdown(false);
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
              href="/dashboard"
              className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 shadow-md shadow-rose-500/15">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Study Chat
              </span>
            </div>
          </div>

          {/* Connection status tag */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {socketConnected ? 'Real-Time Sync Online' : 'Sync Server Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-8 z-10 overflow-hidden h-[75vh]">
        
        {/* Left Column: Classmates roster list */}
        <section className="w-full md:w-[320px] flex flex-col shrink-0 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 gap-4 overflow-hidden h-full">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Student Circle</h3>
            <p className="text-[10px] text-slate-500">Select a classmate to exchange notes and messages.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {sidebarLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-650">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                <span className="text-xs">Loading directory...</span>
              </div>
            ) : classmates.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <p className="text-xs">No other registered students found.</p>
              </div>
            ) : (
              classmates.map((mate) => {
                const isSelected = selectedPartner?.id === mate.id;
                return (
                  <div
                    key={mate.id}
                    onClick={() => handleSelectPartner(mate)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 select-none ${
                      isSelected
                        ? 'bg-slate-900 border-rose-500/35 shadow-md text-white'
                        : 'bg-slate-950/40 hover:bg-slate-900/50 border-slate-900 hover:border-slate-800 text-slate-350 hover:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-xs font-bold text-rose-400 capitalize shrink-0 shadow-inner">
                      {mate.name ? mate.name[0] : mate.email[0]}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-xs font-bold truncate">{mate.name || mate.email.split('@')[0]}</p>
                      <p className="text-[9px] text-slate-550 truncate">{mate.email}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Chat Window Stream */}
        <section className="flex-1 flex flex-col p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 overflow-hidden h-full">
          {!selectedPartner ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 mb-3 text-slate-500">
                <MessageSquare className="h-8 w-8 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Chat Console</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
                Select a classmate from the circle roster on the left to start a persistent, low-latency real-time text and study note swap.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between overflow-hidden h-full">
              
              {/* Partner Header */}
              <div className="pb-3.5 border-b border-slate-850 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-xs font-bold text-rose-400 capitalize shrink-0 shadow-inner">
                  {selectedPartner.name ? selectedPartner.name[0] : selectedPartner.email[0]}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">{selectedPartner.name || selectedPartner.email.split('@')[0]}</p>
                  <p className="text-[9px] text-slate-500">{selectedPartner.email}</p>
                </div>
              </div>

              {/* Message Streams thread */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1 custom-scrollbar h-full">
                {chatLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-550">
                    <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
                    <span className="text-xs font-semibold">Loading conversation...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-600 gap-1.5">
                    <MessageSquare className="h-6 w-6 text-slate-700" />
                    <p className="text-xs">No messages yet.</p>
                    <p className="text-[10px] text-slate-650">Say hi to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSender = msg.senderId === user.id;
                    const hasAttachment = !!msg.noteLinkId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-1 duration-150`}
                      >
                        <div className={`max-w-[80%] space-y-1.5 flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                          
                          {/* Chat bubble body */}
                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isSender 
                              ? 'bg-rose-600 text-white rounded-tr-sm shadow-md' 
                              : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-sm'
                          }`}>
                            <p className="break-words leading-relaxed">{msg.content}</p>

                            {/* Render Attached Dynamic Note reference Card */}
                            {hasAttachment && (
                              <div className={`mt-3 p-3.5 rounded-xl border flex items-center justify-between gap-4 shadow-sm select-none ${
                                isSender
                                  ? 'bg-rose-950/50 border-rose-900/40 text-rose-200'
                                  : 'bg-slate-950/80 border-slate-850 text-slate-300 hover:border-slate-700 transition-colors'
                              }`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4.5 w-4.5 text-rose-400 shrink-0" />
                                  <span className="font-bold truncate text-[11px]">Shared Note file</span>
                                </div>
                                <Link
                                  href={`/dashboard/notes`}
                                  className="flex items-center gap-1 text-[10px] font-bold hover:underline shrink-0"
                                >
                                  Open
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            )}
                          </div>

                          {/* Timestamp details */}
                          <div className="flex items-center gap-1 text-[8px] text-slate-550 font-bold uppercase tracking-wider px-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatTime(msg.createdAt)}</span>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Form & attachment popover */}
              <div className="pt-4 border-t border-slate-850 shrink-0 relative">
                
                {/* Active attachment pill indicator */}
                {attachedNote && (
                  <div className="absolute top-0 -translate-y-[105%] left-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-850 shadow-md z-20 text-[10px] font-bold text-rose-400 animate-in slide-in-from-bottom-2 duration-200">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="max-w-[150px] truncate">{attachedNote.title}</span>
                    <button
                      type="button"
                      onClick={() => setAttachedNote(null)}
                      className="p-0.5 rounded-full hover:bg-slate-900 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Attachment Selection dropdown */}
                {showAttachmentDropdown && (
                  <div className="absolute top-0 -translate-y-[105%] left-0 w-[280px] p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-20 space-y-2 animate-in slide-in-from-bottom-3 duration-250">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Attach note resource</span>
                      <button 
                        onClick={() => setShowAttachmentDropdown(false)}
                        className="text-slate-500 hover:text-white cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {notes.length === 0 ? (
                        <p className="text-[10px] text-slate-550 text-center py-4">No notes created yet.</p>
                      ) : (
                        notes.map((note) => (
                          <div
                            key={note.id}
                            onClick={() => handleAttachNote(note)}
                            className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-950 border border-slate-900 hover:border-slate-800 cursor-pointer flex items-center gap-2 transition-colors overflow-hidden"
                          >
                            <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-300 truncate">{note.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Main Send Form */}
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  
                  {/* Note Attachment trigger button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!socketConnected) return;
                      setShowAttachmentDropdown(!showAttachmentDropdown);
                    }}
                    disabled={!socketConnected}
                    className="p-3.5 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-950/50 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-20 shrink-0 shadow-md"
                  >
                    <Paperclip className="h-4.5 w-4.5" />
                  </button>

                  <input
                    type="text"
                    required={!attachedNote}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      socketConnected 
                        ? "Type your messaging dialogue here..."
                        : "Messaging offline. Sockets sync server is unreachable."
                    }
                    disabled={!socketConnected}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all duration-200 text-sm disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!socketConnected || (!inputText.trim() && !attachedNote)}
                    className="flex items-center justify-center p-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-md shadow-rose-500/15 transition-all duration-200 disabled:opacity-30 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>

                </form>
              </div>

            </div>
          )}
        </section>

      </main>

      {/* Footer minimal */}
      <footer className="border-t border-slate-900/50 py-6 text-center z-10">
        <p className="text-xs text-slate-500">
          StudyHub Study Chat MVP - Real-time low-latency student sharing circle.
        </p>
      </footer>
    </div>
  );
}
