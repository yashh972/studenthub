import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Sparkles, 
  FileText, 
  Layers, 
  CheckSquare, 
  Timer, 
  MessageSquare, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

export default function Home() {
  const highlights = [
    { title: 'Notes Hub', desc: 'Securely upload notes and PDFs. Find files instantly, toggle public access, and study with peers.', icon: FileText, color: 'text-blue-400 bg-blue-500/10' },
    { title: 'AI Practice Tests', desc: 'Instantly transform text files or PDF materials into structured multiple-choice quiz questions using Gemini.', icon: Sparkles, color: 'text-violet-400 bg-violet-500/10' },
    { title: 'Flashcards', desc: 'Accelerate memory retention. Manually design custom study decks or let AI generate them directly from your notes.', icon: Layers, color: 'text-indigo-400 bg-indigo-500/10' },
    { title: 'Integrated To-Dos', desc: 'Keep track of academic deliverables, deadliness, and tasks connected directly to your workspace.', icon: CheckSquare, color: 'text-emerald-400 bg-emerald-500/10' },
    { title: 'Focus Timer', desc: 'Structure study sessions with a Pomodoro timer and logging history to track progress.', icon: Timer, color: 'text-amber-400 bg-amber-500/10' },
    { title: 'Study Chat', desc: 'Participate in real-time, low-latency discussion rooms and swap note links with classmates.', icon: MessageSquare, color: 'text-rose-400 bg-rose-500/10' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background Soft Glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Modern Top Header / Navbar */}
      <nav className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/15">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            StudyHub
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/community-hub"
            className="text-slate-350 hover:text-white text-sm font-semibold transition-colors duration-200"
          >
            Community Hub
          </Link>
          <span className="w-1 h-1 bg-slate-800 rounded-full" />
          <Link
            href="/login"
            className="text-slate-300 hover:text-white text-sm font-semibold transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-violet-500/20 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto text-center px-6 pt-20 pb-16 z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/40 border border-violet-850/30 text-xs font-semibold text-violet-300 mb-6 backdrop-blur-md">
          <BookOpen className="h-4 w-4 text-violet-400" />
          Seamless Academic MVP Workstation
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight sm:leading-none">
          The ultimate study platform to{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            organize, test & master
          </span>{' '}
          your learning
        </h1>

        <p className="mt-6 text-slate-400 text-base sm:text-xl max-w-2xl leading-relaxed">
          Consolidate your notes, generate mock tests via Gemini AI, practice retention with flashcards, and coordinate with classmates in real time.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm sm:max-w-none">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 transition-all duration-200 group"
          >
            Start Studying Free
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 duration-200" />
          </Link>
          
          <Link
            href="/community-hub"
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-sm text-slate-200 hover:text-white font-bold text-base hover:border-slate-700 transition-all duration-200"
          >
            Public Community Hub
          </Link>
        </div>
      </section>

      {/* Grid Showcase Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 z-10 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Everything you need in a single dashboard
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Ditch fragmented study tools. Consolidate your academic workflow under a unified, premium student workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-slate-700/80 shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900/60"
              >
                <div className={`inline-flex p-3 rounded-xl ${item.color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="border-t border-slate-900/70 py-10 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-500" />
            <span className="font-bold text-slate-300 text-sm">StudyHub MVP</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} StudyHub. Built for high-efficiency education. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
