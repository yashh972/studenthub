'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  GraduationCap,
  CheckSquare,
  Plus,
  Trash2,
  ListTodo,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function TodosPage() {
  const { user } = useAuth();

  // Platform state lists
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'completed'

  // Input forms
  const [taskText, setTaskText] = useState('');
  
  // Feedback states
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // AI Study Planner states
  const [creatorMode, setCreatorMode] = useState('manual'); // 'manual' | 'ai'
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // 1. Fetch checklists
  const fetchTodos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
      }
    } catch (err) {
      console.error('Error fetching todos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // 2. Add new task checklist item
  const handleAddTodo = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!taskText.trim()) {
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskText })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add task.');
      }

      setTaskText('');
      await fetchTodos();
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 2.5 Generate AI Systematic Study plan
  const handleGenerateAiPlan = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!aiPrompt.trim()) {
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/todos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI plan.');
      }

      setAiPrompt('');
      setCreatorMode('manual'); // Toggle back to standard view
      await fetchTodos();
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 3. Toggle Complete checklist status
  const handleToggleComplete = async (todoId, currentStatus) => {
    try {
      // Optimistic updates inside state for snappy micro-animations!
      setTodos(prev => 
        prev.map(item => 
          item.id === todoId ? { ...item, isCompleted: !currentStatus } : item
        )
      );

      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });

      if (!res.ok) {
        // Rollback optimistic state changes if server update fails
        await fetchTodos();
        const data = await res.json();
        alert(data.error || 'Failed to update task.');
      }
    } catch (err) {
      console.error('Toggle complete error:', err);
      await fetchTodos();
    }
  };

  // 4. Delete checklist task
  const handleDeleteTodo = async (todoId) => {
    try {
      // Optimistic delete
      setTodos(prev => prev.filter(item => item.id !== todoId));

      const res = await fetch(`/api/todos/${todoId}`, { method: 'DELETE' });
      if (!res.ok) {
        await fetchTodos();
        const data = await res.json();
        alert(data.error || 'Failed to delete task.');
      }
    } catch (err) {
      console.error('Delete todo error:', err);
      await fetchTodos();
    }
  };

  // Stats summaries
  const totalCount = todos.length;
  const completedCount = todos.filter(t => t.isCompleted).length;
  const activeCount = totalCount - completedCount;
  const completionRatio = totalCount > 0 ? completedCount / totalCount : 0;
  const progressPercent = Math.round(completionRatio * 100);

  // Filter tasks based on active category
  const filteredTodos = todos.filter(t => {
    if (activeFilter === 'active') return !t.isCompleted;
    if (activeFilter === 'completed') return t.isCompleted;
    return true; // 'all'
  });

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
              <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/15">
                <CheckSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                To-Do Lists
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 z-10 space-y-8 flex flex-col justify-center">
        
        {/* Workspace Intro */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-900/40 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              <ListTodo className="h-3.5 w-3.5" />
              Checklist Workspace
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Academic Tasks Checklist</h2>
            <p className="text-xs text-slate-400">Pencil down coursework deadlines, project checks, and daily study milestones.</p>
          </div>

          {/* Progress Analytics bar */}
          <div className="space-y-2 pt-2 border-t border-slate-850/60">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Overall Progress</span>
              <span>{completedCount} of {totalCount} completed ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-650 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Creator input bar */}
        <div className="p-4.5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          
          {/* Creator Mode Switcher Tabs */}
          <div className="flex gap-2 border-b border-slate-850/60 pb-3">
            <button
              onClick={() => { setCreatorMode('manual'); setError(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                creatorMode === 'manual'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Manual Add
            </button>
            <button
              onClick={() => { setCreatorMode('ai'); setError(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                creatorMode === 'ai'
                  ? 'bg-gradient-to-r from-violet-650 to-indigo-650 text-white border border-violet-600/50 shadow-md shadow-violet-500/10'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
              ✨ AI Study Planner
            </button>
          </div>

          {creatorMode === 'manual' ? (
            <form onSubmit={handleAddTodo} className="flex gap-3">
              <input
                type="text"
                required
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="e.g. Study Physics Chapter 3 recap slides..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 text-sm"
              />
              
              <button
                type="submit"
                disabled={formLoading || !taskText.trim()}
                className="flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-500/15 transition-all duration-250 disabled:opacity-30 shrink-0 cursor-pointer"
              >
                {formLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5 shrink-0" />
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleGenerateAiPlan} className="space-y-4">
              <textarea
                rows={3}
                required
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your study topic and timeline (e.g. 'I have a computer networks exam in 3 days. Help me cover TCP/IP and DNS.')"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 text-sm resize-none"
              />

              {/* Suggestions Chips */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Suggested Prompts</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "I have a mid-term in 2 days on Biology Ch. 3-5.",
                    "Code a React weather app from scratch in 3 days.",
                    "Write a 1000-word history essay by tomorrow."
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiPrompt(suggestion)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-slate-850 text-[11px] text-slate-400 hover:text-slate-205 transition-all duration-200 text-left select-none cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-sm shadow-md shadow-violet-500/15 transition-all duration-250 disabled:opacity-30 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Gemini AI is scheduling your systematic study plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-violet-300" />
                    <span>⚡ Generate Systematic Plan</span>
                  </>
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/35 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Category Toggles and Checklist Grid */}
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Category tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-900">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-850">
              {['all', 'active', 'completed'].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-slate-950 text-white border border-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-650" />
                <span>{activeCount} Active</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-slate-650" />
                <span>{completedCount} Done</span>
              </span>
            </div>
          </div>

          {/* List display */}
          <div className="flex-1 overflow-y-auto max-h-[450px] space-y-3 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-slate-550">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="text-xs">Loading checklists...</span>
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/10 border border-slate-900/60 border-dashed">
                <CheckSquare className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No tasks found</p>
                <p className="text-xs text-slate-550 max-w-xs mx-auto mt-1 leading-relaxed">
                  {activeFilter === 'completed' 
                    ? 'Check off active items in your workspace first.'
                    : activeFilter === 'active'
                      ? 'All caught up! Outstanding work!'
                      : 'Create a study task in the uploader input above.'
                  }
                </p>
              </div>
            ) : (
              filteredTodos.map((todo) => {
                const isDone = todo.isCompleted;
                return (
                  <div
                    key={todo.id}
                    onClick={() => handleToggleComplete(todo.id, isDone)}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-200 cursor-pointer select-none group ${
                      isDone
                        ? 'bg-slate-900/20 border-slate-900/50 shadow-inner'
                        : 'bg-slate-900/40 hover:bg-slate-900 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    {/* Left check controls */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      
                      {/* Check Box custom element */}
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isDone 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : 'border-slate-800 group-hover:border-slate-650 bg-slate-950'
                      }`}>
                        {isDone && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                      </div>

                      {/* Task Text element with strike through transition */}
                      <span className={`text-sm font-medium transition-all duration-200 break-words line-clamp-2 ${
                        isDone 
                          ? 'line-through text-slate-550 opacity-40 select-none' 
                          : 'text-slate-100 group-hover:text-white'
                      }`}>
                        {todo.task}
                      </span>
                    </div>

                    {/* Delete item button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTodo(todo.id); }}
                      title="Delete task"
                      className="p-1.5 rounded-lg border border-slate-850 group-hover:border-slate-800 bg-slate-950 text-slate-500 hover:text-red-400 hover:border-red-950 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    </button>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* Footer minimal */}
      <footer className="border-t border-slate-900/50 py-6 text-center z-10">
        <p className="text-xs text-slate-500">
          StudyHub To-Do MVP - Designed for academic checklist organization.
        </p>
      </footer>
    </div>
  );
}
