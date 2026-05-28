'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  GraduationCap,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  Check,
  HelpCircle,
  BookOpen
} from 'lucide-react';

export default function FlashcardsPage() {
  const { user } = useAuth();

  // Platform state lists
  const [flashcards, setFlashcards] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active toggles & selection states
  const [flippedCards, setFlippedCards] = useState({}); // { [cardId]: boolean }
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [editingCard, setEditingCard] = useState(null); // stores card object when editing

  // Modals visibility toggles
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  // Form input fields
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualNoteId, setManualNoteId] = useState('');

  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  // Status feedback states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 1. Fetch user flashcards and notes library
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cardsRes, notesRes] = await Promise.all([
        fetch('/api/flashcards'),
        fetch('/api/notes')
      ]);

      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        setFlashcards(cardsData.flashcards || []);
      }
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
        if (notesData.notes?.length > 0) {
          setSelectedNoteId(notesData.notes[0].id);
          setManualNoteId(notesData.notes[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching flashcard workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Card Flipping toggle
  const toggleFlip = (cardId) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // 3. Create Manual Flashcard
  const handleCreateManual = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!manualFront.trim() || !manualBack.trim()) {
      setFormError('Please fill in both the Question (Front) and Answer (Back) text fields.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: manualFront,
          back: manualBack,
          noteId: manualNoteId || null
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create flashcard.');
      }

      setFormSuccess('Flashcard created successfully!');
      setManualFront('');
      setManualBack('');
      await fetchData();

      setTimeout(() => {
        setShowCreateModal(false);
        setFormSuccess('');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 4. Generate AI Decks from lecture notes
  const handleGenerateAIDeck = async (e) => {
    e.preventDefault();
    if (!selectedNoteId) {
      setFormError('Please select a note material topic first.');
      return;
    }

    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate: true,
          noteId: selectedNoteId
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate flashcards.');
      }

      setFormSuccess(`Gemini created exactly 5 flashcards from the notes material!`);
      await fetchData();

      setTimeout(() => {
        setShowAIModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 5. Update Flashcard text content
  const handleEditCard = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!editFront.trim() || !editBack.trim()) {
      setFormError('Both sides of the flashcard must contain text content.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/flashcards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: editFront, back: editBack })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update card.');
      }

      setFormSuccess('Flashcard updated successfully!');
      await fetchData();

      setTimeout(() => {
        setEditingCard(null);
        setFormSuccess('');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 6. Delete Flashcard
  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) {
      return;
    }

    try {
      const res = await fetch(`/api/flashcards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete card.');
      }
    } catch (err) {
      console.error('Delete card error:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (card) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Dynamic 3D Flipping CSS structures injected cleanly */}
      <style>{`
        .flip-card {
          perspective: 1000px;
          height: 240px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-card-flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 1.5rem;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 9999px;
        }
      `}</style>

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
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/15">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Flashcards
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Card</span>
            </button>
            
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-md shadow-indigo-500/15 transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Deck Generator</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 z-10 space-y-8 flex flex-col">
        
        {/* Workspace Intro */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-900/40 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5" />
              Active Cards Deck
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Active Flashcards Library</h2>
            <p className="text-xs text-slate-400">Click individual cards to flip in 3D and test your memorization skills.</p>
          </div>
          
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-400">
            Total Cards: <strong className="text-white font-bold">{flashcards.length}</strong>
          </div>
        </div>

        {/* Flashcard grid nodes */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-sm font-medium">Loading cards library...</span>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4 rounded-3xl bg-slate-900/10 border border-slate-900 border-dashed">
            <Layers className="h-10 w-10 text-slate-650 mb-3" />
            <h3 className="text-lg font-bold text-white">No flashcards found</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed font-sans">
              Create individual cards manually by clicking **Add Card**, or select lecture notes using the **AI Deck Generator** to let Gemini construct conceptual flashcards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashcards.map((card, idx) => {
              const isFlipped = flippedCards[card.id] || false;
              return (
                <div 
                  key={card.id}
                  className="flex flex-col gap-3 group relative"
                >
                  {/* Outer Flip Node */}
                  <div 
                    onClick={() => toggleFlip(card.id)}
                    className="flip-card cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                  >
                    <div className={`flip-card-inner ${isFlipped ? 'flip-card-flipped' : ''}`}>
                      
                      {/* FRONT FACE (Question) */}
                      <div className="flip-card-front bg-slate-900 border border-slate-850 p-6 flex flex-col justify-between shadow-lg shadow-black/30">
                        <div className="flex items-center justify-between text-[10px] text-indigo-400 uppercase tracking-widest font-bold font-mono">
                          <span>Card #{idx + 1}</span>
                          <HelpCircle className="h-4 w-4 shrink-0 text-slate-500" />
                        </div>
                        
                        <div className="my-auto py-2">
                          <p className="text-sm font-extrabold text-white leading-relaxed line-clamp-4">
                            {card.front}
                          </p>
                        </div>

                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider pt-2 border-t border-slate-950/60">
                          Tap to reveal answer
                        </span>
                      </div>

                      {/* BACK FACE (Answer/Explanation) */}
                      <div className="flip-card-back bg-indigo-950/20 border border-indigo-900/30 p-6 flex flex-col justify-between shadow-lg shadow-indigo-950/5">
                        <div className="flex items-center justify-between text-[10px] text-indigo-300 uppercase tracking-widest font-bold font-mono">
                          <span>Answer Key</span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-950/50 border border-indigo-900/40 text-[8px] font-bold text-indigo-400">Recall</span>
                        </div>

                        <div className="my-auto py-2">
                          <p className="text-sm font-semibold text-indigo-200 leading-relaxed line-clamp-4">
                            {card.back}
                          </p>
                        </div>

                        <span className="text-[10px] text-indigo-400/60 font-semibold uppercase tracking-wider pt-2 border-t border-indigo-900/10">
                          Tap to hide
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Manual card actions bottom bar */}
                  <div className="flex items-center justify-end gap-1.5 pr-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(card); }}
                      title="Edit flashcard"
                      className="p-2 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                      title="Delete flashcard"
                      className="p-2 rounded-xl border border-slate-850 hover:border-red-950 bg-slate-900/60 text-slate-400 hover:text-red-400 transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* --- MODAL 1: ADD MANUAL FLASHCARD --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setShowCreateModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-500" />
                Add Manual Flashcard
              </h3>
              <p className="text-xs text-slate-400">Design a custom concept check pair to add to your library.</p>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-5">
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

              {/* Front input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Front Side (Question / Concept) *</label>
                <textarea
                  required
                  rows={3}
                  value={manualFront}
                  onChange={(e) => setManualFront(e.target.value)}
                  placeholder="e.g. What is polymorphism in Object-Oriented Programming?"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-sm font-sans"
                />
              </div>

              {/* Back input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Back Side (Answer / Explanation) *</label>
                <textarea
                  required
                  rows={3}
                  value={manualBack}
                  onChange={(e) => setManualBack(e.target.value)}
                  placeholder="e.g. The ability of different classes to respond to the same message or method call in their own specific way."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-sm font-sans"
                />
              </div>

              {/* Note link selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link to Note Topic (Optional)</label>
                <select
                  value={manualNoteId}
                  onChange={(e) => setManualNoteId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm appearance-none cursor-pointer"
                >
                  <option value="">Do not link note</option>
                  {notes.map(n => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
              </div>

              {/* Submit Manual */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-md shadow-indigo-500/15 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Create Flashcard'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: AI FLASHCARD DECK GENERATOR --- */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setShowAIModal(false); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                AI Flashcards Generator
              </h3>
              <p className="text-xs text-slate-400">Generate a concepts deck of exactly 5 flashcards using Gemini AI.</p>
            </div>

            {notes.length === 0 ? (
              <div className="p-6 text-center space-y-4">
                <p className="text-sm text-slate-500">You must upload slide notes or write text first.</p>
                <Link
                  href="/dashboard/notes"
                  onClick={() => setShowAIModal(false)}
                  className="inline-flex px-4 py-2 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 text-blue-400 hover:text-blue-300 text-xs font-bold transition-all"
                >
                  Create Notes Library
                </Link>
              </div>
            ) : (
              <form onSubmit={handleGenerateAIDeck} className="space-y-5">
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

                {/* Dropdown topic selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Study Material Note Topic *</label>
                  <select
                    value={selectedNoteId}
                    onChange={(e) => setSelectedNoteId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm appearance-none cursor-pointer"
                  >
                    {notes.map(n => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>

                {/* Submit AI build */}
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/15 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Gemini is reading material...</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5" />
                      <span>Generate Decks</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT EXISTING FLASHCARD --- */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
            <button
              onClick={() => { setEditingCard(null); setFormError(''); }}
              className="absolute top-6 right-6 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-500" />
                Edit Flashcard content
              </h3>
              <p className="text-xs text-slate-400">Modify the front question or back answer content values.</p>
            </div>

            <form onSubmit={handleEditCard} className="space-y-5">
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

              {/* Edit Front */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Front Side (Question) *</label>
                <textarea
                  required
                  rows={3}
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-sm font-sans"
                />
              </div>

              {/* Edit Back */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Back Side (Answer) *</label>
                <textarea
                  required
                  rows={3}
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-sm font-sans"
                />
              </div>

              {/* Save changes */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-md shadow-indigo-500/15 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Save Flashcard'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
