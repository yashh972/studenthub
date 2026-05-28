'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  GraduationCap,
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  Sparkles,
  History,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function FocusTimerPage() {
  const { user } = useAuth();

  // Timer configuration presets
  const presets = {
    focus: { label: 'Focus Work', duration: 25 * 60, color: 'from-orange-650 to-amber-600', text: 'text-orange-450', bg: 'bg-orange-500/10', ring: 'border-orange-500/30' },
    shortBreak: { label: 'Short Break', duration: 5 * 60, color: 'from-emerald-600 to-teal-600', text: 'text-emerald-450', bg: 'bg-emerald-500/10', ring: 'border-emerald-500/30' },
    longBreak: { label: 'Long Break', duration: 15 * 60, color: 'from-blue-600 to-cyan-600', text: 'text-blue-450', bg: 'bg-blue-500/10', ring: 'border-blue-500/30' }
  };

  // State controls
  const [mode, setMode] = useState('focus'); // 'focus' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(presets.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const timerRef = useRef(null);

  // Fetch Pomodoro study history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/focus-sessions');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.sessions || []);
      }
    } catch (err) {
      console.error('Error loading Pomodoro logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Sync mode changes with time duration values
  useEffect(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(presets[mode].duration);
  }, [mode]);

  // Main countdown timer interval logic
  const handleStartPause = () => {
    if (isRunning) {
      // Pause
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      // Start
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleSessionComplete(); // Trigger save
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Triggered when the timer runs down to 0
  const handleSessionComplete = async () => {
    // Play sound notification
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 523.25; // C5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (err) {
      console.warn('Audio notification failed:', err.message);
    }

    alert(`⏰ Focus Interval Finished! Take a break.`);

    // Log to DB only if we completed a "Focus Work" session
    if (mode === 'focus') {
      try {
        const res = await fetch('/api/focus-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: presets.focus.duration })
        });
        if (res.ok) {
          await fetchHistory(); // reload logs list
        }
      } catch (err) {
        console.error('Failed to log completed Pomodoro session:', err);
      }
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(presets[mode].duration);
  };

  // Helper formatting values
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Analytics helper calculations
  const totalFocusSeconds = history.reduce((sum, item) => sum + item.duration, 0);
  const totalHoursTracked = (totalFocusSeconds / 3600).toFixed(1);
  const completedSessionsCount = history.length;
  
  const activePreset = presets[mode];
  const progressPercent = ((activePreset.duration - timeLeft) / activePreset.duration) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background radial soft glows */}
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
              <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 shadow-md shadow-amber-500/15">
                <Timer className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Focus Timer
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main split-screen container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 z-10 flex flex-col lg:flex-row gap-8 overflow-hidden">
        
        {/* Left Column: Pomodoro Circular Timer Clock */}
        <section className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl space-y-8 relative">
          
          {/* Preset Buttons toggles */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-900">
            {Object.keys(presets).map((key) => {
              const preset = presets[key];
              const isSelected = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Clock Ticker Circular Area */}
          <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center rounded-full bg-slate-950 border-8 border-slate-900 shadow-inner group">
            
            {/* Visual dynamic progress ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                className="stroke-slate-900"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                className={`transition-all duration-300 ease-linear ${
                  mode === 'focus' 
                    ? 'stroke-orange-500' 
                    : mode === 'shortBreak'
                      ? 'stroke-emerald-500'
                      : 'stroke-blue-500'
                }`}
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 46}%`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - progressPercent / 100)}%`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Centered Digital Countdown Ticker */}
            <div className="text-center space-y-1">
              <span className={`text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent font-mono select-none`}>
                {formatTime(timeLeft)}
              </span>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                {activePreset.label}
              </p>
            </div>
          </div>

          {/* Clock interactive Controls */}
          <div className="flex items-center gap-4">
            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="p-3 rounded-2xl border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-white transition-all cursor-pointer shadow-md"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            {/* Start / Pause Button */}
            <button
              onClick={handleStartPause}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer ${
                isRunning
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 hover:border-slate-700 shadow-inner'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20 shadow-lg'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-5 w-5 shrink-0 fill-current" />
                  <span>Pause Session</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 shrink-0 fill-current" />
                  <span>Start Studying</span>
                </>
              )}
            </button>
          </div>

        </section>

        {/* Right Column: Focus Analytics & Session logs list */}
        <section className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0">
          
          {/* Stats Analytics Dashboard */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 grid grid-cols-2 gap-4">
            
            {/* Hours tracked */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Tracked Hours</span>
                <Clock className="h-4 w-4 text-orange-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-extrabold text-white">{totalHoursTracked}</p>
                <p className="text-[10px] text-slate-400">Total study sessions</p>
              </div>
            </div>

            {/* Completed sessions */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Completed Sessions</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-extrabold text-white">{completedSessionsCount}</p>
                <p className="text-[10px] text-slate-400">25m work intervals</p>
              </div>
            </div>

          </div>

          {/* Session logs list */}
          <div className="flex-1 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4 flex flex-col min-h-[300px] lg:min-h-0">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-850">
              <History className="h-4.5 w-4.5 text-slate-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pomodoro Logs</h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[320px] lg:max-h-[40vh] space-y-3 pr-1 custom-scrollbar">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-550">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="text-xs font-semibold">Loading records...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl bg-slate-950/20 border border-slate-900">
                  <TrendingUp className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-500">No Pomodoro intervals logged yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Complete your first 25-minute focus session to start logging logs.</p>
                </div>
              ) : (
                history.map((session, idx) => (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-900 hover:border-slate-850 flex items-center justify-between gap-3 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-950/40 border border-orange-900/30 text-orange-400 shrink-0">
                        <Timer className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-200">Focus Work Interval</p>
                        <p className="text-[9px] text-slate-550">{formatDate(session.createdAt)}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-orange-950/50 border border-orange-900/30 text-orange-400">
                      {(session.duration / 60)} Mins
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </main>

      {/* Footer minimal */}
      <footer className="border-t border-slate-900/50 py-6 text-center z-10">
        <p className="text-xs text-slate-500">
          StudyHub Focus Timer - Built for structured student productivity.
        </p>
      </footer>
    </div>
  );
}
