'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  BookOpen,
  History,
  Play,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';

export default function PracticeTestsPage() {
  const { user } = useAuth();

  // Platform lists states
  const [quizzes, setQuizzes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active quiz session states
  const [activeSession, setActiveSession] = useState(null); // stores active quizSession object
  const [activeQuestions, setActiveQuestions] = useState([]); // stores 5 quiz questions (without correctAnswer keys)
  const [currentStep, setCurrentStep] = useState(0); // 0 to 4 stepper index
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: "A" | "B" | "C" | "D" }
  
  // Scored review state
  const [quizResults, setQuizResults] = useState(null); // stores scored response breakdown

  // Creation forms
  const [selectedNoteId, setSelectedNoteId] = useState('');
  
  // Feedback states
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch past quiz attempts and user notes library
  const fetchData = async () => {
    setLoading(true);
    try {
      const [quizzesRes, notesRes] = await Promise.all([
        fetch('/api/quizzes'),
        fetch('/api/notes')
      ]);

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData.quizzes || []);
      }
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
        if (notesData.notes?.length > 0) {
          setSelectedNoteId(notesData.notes[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching quiz workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Trigger AI Mock Exam generation
  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!selectedNoteId) {
      setError('Please select a note material first.');
      return;
    }

    setError('');
    setQuizLoading(true);
    setQuizResults(null);
    setSelectedAnswers({});
    setCurrentStep(0);

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: selectedNoteId })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate practice test.');
      }

      setActiveSession(data.quizSession);
      setActiveQuestions(data.questions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  // 3. Option Selection Handler
  const handleSelectOption = (questionId, optionKey) => {
    if (quizResults) return; // disable modification once scored
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  // 4. Submit Quiz to Server for secure scoring
  const handleSubmitQuiz = async () => {
    if (activeQuestions.length === 0) return;
    setError('');
    setQuizLoading(true);

    try {
      const res = await fetch(`/api/quizzes/${activeSession.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit quiz.');
      }

      setQuizResults(data);
      await fetchData(); // Refresh sidebar history list
    } catch (err) {
      setError(err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  // Switch to review mode for a past session
  const handleReviewPastQuiz = async (sessionId) => {
    setError('');
    setQuizLoading(true);
    setActiveSession(null);
    setActiveQuestions([]);
    setQuizResults(null);

    try {
      // Re-submit empty answers to retrieve the full, scored review breakdown safely
      const res = await fetch(`/api/quizzes/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: {} })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load quiz details.');
      }

      setQuizResults(data);
      // Map user answers back to selections
      const userAnswersMap = {};
      data.review.forEach(item => {
        userAnswersMap[item.id] = item.userAnswer;
      });
      setSelectedAnswers(userAnswersMap);
      
      // Map review list back to active questions structure
      setActiveQuestions(data.review.map(item => ({
        id: item.id,
        question: item.question,
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD
      })));
      setActiveSession({ id: sessionId, noteTitle: data.noteTitle });
      setCurrentStep(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleResetQuiz = () => {
    setActiveSession(null);
    setActiveQuestions([]);
    setQuizResults(null);
    setSelectedAnswers({});
    setCurrentStep(0);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Visual helper calculations
  const totalQuestions = activeQuestions.length;
  const currentQuestion = activeQuestions[currentStep];
  const progressPercent = totalQuestions > 0 ? ((currentStep + 1) / totalQuestions) * 100 : 0;
  const isLastStep = currentStep === totalQuestions - 1;
  const answeredCount = Object.keys(selectedAnswers).filter(k => selectedAnswers[k]).length;
  const allAnswered = answeredCount === totalQuestions;

  // Visual feedback based on score percentage
  const getScoreFeedback = (score, total) => {
    const ratio = score / total;
    if (ratio === 1) return { text: 'Flawless Masterpiece! Perfect score!', color: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20' };
    if (ratio >= 0.8) return { text: 'Outstanding Performance! Excellent work!', color: 'text-teal-400 border-teal-900/40 bg-teal-950/20' };
    if (ratio >= 0.6) return { text: 'Good Effort! Keep reviewing to improve.', color: 'text-blue-400 border-blue-900/40 bg-blue-950/20' };
    return { text: 'Room for improvement! Go back to notes hub and study.', color: 'text-amber-400 border-amber-900/40 bg-amber-950/20' };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background soft glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[180px] pointer-events-none" />

      {/* Header Bar */}
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
              <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 shadow-md shadow-violet-500/15">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Practice Tests
              </span>
            </div>
          </div>

          {activeSession && (
            <button
              onClick={handleResetQuiz}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-350 hover:text-white text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Take Another Test</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container split screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 z-10 overflow-hidden">
        
        {/* Left Column: Generator panel and Past attempts */}
        <section className="w-full lg:w-[360px] flex flex-col shrink-0 gap-6">
          
          {/* Note material selector card */}
          {!activeSession && (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Study Material</h3>
                <p className="text-xs text-slate-400">Choose slide notes from your library to generate an AI exam.</p>
              </div>

              {notes.length === 0 ? (
                <div className="p-4.5 rounded-xl bg-slate-950/80 border border-slate-850 text-center space-y-2.5">
                  <p className="text-xs text-slate-500">Your StudyHub notes library is empty.</p>
                  <Link
                    href="/dashboard/notes"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold"
                  >
                    Go Upload Notes First
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleGenerateQuiz} className="space-y-4">
                  <div className="space-y-1.5">
                    <select
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 text-sm appearance-none cursor-pointer"
                    >
                      {notes.map(note => (
                        <option key={note.id} value={note.id}>
                          {note.pdfUrl ? '📄 [PDF] ' : '📝 [Text] '}
                          {note.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={quizLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {quizLoading ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 shrink-0 fill-current" />
                        <span>Generate Practice Exam</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Past Attempts history panel */}
          <div className="flex-1 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4 flex flex-col min-h-[300px] lg:min-h-0">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-850">
              <History className="h-4.5 w-4.5 text-slate-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Attempt History</h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[350px] lg:max-h-[45vh] space-y-2.5 pr-1 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-slate-550">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  <span className="text-xs">Loading history...</span>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl bg-slate-950/20 border border-slate-900">
                  <p className="text-xs text-slate-500">No mock test history found.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Generate a test above to begin tracking records.</p>
                </div>
              ) : (
                quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    onClick={() => handleReviewPastQuiz(quiz.id)}
                    className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 group select-none"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{quiz.noteTitle}</p>
                      <p className="text-[9px] text-slate-550">{formatDate(quiz.createdAt)}</p>
                    </div>
                    
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        quiz.score >= 4 
                          ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/35'
                          : quiz.score >= 3
                            ? 'text-blue-400 bg-blue-950/40 border border-blue-900/35'
                            : 'text-amber-400 bg-amber-950/40 border border-amber-900/35'
                      }`}>
                        {quiz.score}/5
                      </span>
                      <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider group-hover:text-violet-400 transition-colors">Review</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Column: In-progress quiz stepper or scored review */}
        <section className="flex-1 min-w-0 flex flex-col">
          
          {/* STATE 1: Empty Selection page */}
          {!activeSession && !quizLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-slate-900/10 border border-slate-900/60">
              <div className="p-4.5 rounded-2xl bg-slate-900/40 border border-slate-850 mb-4 text-slate-500">
                <GraduationCap className="h-10 w-10 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide">AI Exam Simulator</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed font-sans">
                Choose a plain text note or an uploaded lecture PDF from the sidebar dropdown, then click **Generate** to let Gemini build a customized 5-question multiple-choice exam.
              </p>
            </div>
          )}

          {/* STATE 2: In-progress loading skeleton */}
          {quizLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-violet-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Gemini is studying your materials...</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  We are parsing text structures, analyzing core educational concepts, and generating practice questions. Please hold on.
                </p>
              </div>
            </div>
          )}

          {/* STATE 3 & 4: Active Stepper or Results Panel */}
          {activeSession && !quizLoading && (
            <div className="flex-1 flex flex-col p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl relative">
              
              {/* Stepper Header details */}
              <div className="pb-4 border-b border-slate-800 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Practice Exam Session</p>
                  <h3 className="text-lg font-extrabold text-white line-clamp-1">{activeSession.noteTitle}</h3>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 shrink-0">
                  <span>Questions Answered: {answeredCount}/{totalQuestions}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-slate-350">MCQ Format</span>
                </div>
              </div>

              {/* Quiz content wrapper */}
              {!quizResults ? (
                // ACTIVE STEPPER EXAM
                <div className="flex-1 flex flex-col justify-between gap-8">
                  <div className="space-y-6">
                    {/* Stepper progress bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>Question {currentStep + 1} of {totalQuestions}</span>
                        <span>{Math.round(progressPercent)}% Complete</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Question text box */}
                    {currentQuestion && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-1 duration-200">
                        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850/80 shadow-inner">
                          <p className="text-base font-bold text-white leading-relaxed">{currentQuestion.question}</p>
                        </div>

                        {/* Options Selectable list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {['A', 'B', 'C', 'D'].map((key) => {
                            const optionText = currentQuestion[`option${key}`];
                            const isSelected = selectedAnswers[currentQuestion.id] === key;
                            return (
                              <button
                                key={key}
                                onClick={() => handleSelectOption(currentQuestion.id, key)}
                                className={`p-4.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3.5 select-none cursor-pointer hover:scale-[1.01] ${
                                  isSelected
                                    ? 'bg-violet-950/40 border-violet-500/50 shadow-md shadow-violet-500/5 text-white'
                                    : 'bg-slate-950/30 hover:bg-slate-950/80 border-slate-850 text-slate-350 hover:text-slate-200'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tracking-wide transition-all ${
                                  isSelected 
                                    ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-sm'
                                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                                }`}>
                                  {key}
                                </span>
                                <span className="text-sm font-semibold leading-relaxed leading-5 pt-0.5">{optionText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stepper Footer actions */}
                  <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                      disabled={currentStep === 0}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-950/50 text-slate-350 hover:text-white text-xs font-bold transition-all duration-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>

                    {isLastStep ? (
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={!allAnswered}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/15 transition-all duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Submit Quiz</span>
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentStep(prev => Math.min(totalQuestions - 1, prev + 1))}
                        className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-950/50 text-slate-350 hover:text-white text-xs font-bold transition-all duration-200 cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // SCORED RESULTS PANEL & REVIEW
                <div className="flex-1 flex flex-col justify-between gap-8 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1">
                  
                  {/* Results score circle analytics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-950 border border-slate-850/80 items-center">
                    
                    {/* Score Badge */}
                    <div className="flex flex-col items-center justify-center space-y-2 border-r md:border-r border-slate-850/80 pb-4 md:pb-0 shrink-0">
                      <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-slate-900 border-4 border-slate-800 shadow-md">
                        <div className="absolute inset-2 rounded-full border border-dashed border-violet-500/20" />
                        <span className="text-3xl font-extrabold text-white tracking-tight">{quizResults.score} <span className="text-xs text-slate-500">/ 5</span></span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Exam Score</span>
                    </div>

                    {/* Feedback details */}
                    <div className="md:col-span-2 space-y-3 pl-0 md:pl-2 text-center md:text-left">
                      <div className={`inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${getScoreFeedback(quizResults.score, 5).color}`}>
                        {getScoreFeedback(quizResults.score, 5).text}
                      </div>
                      <h4 className="text-base font-bold text-slate-200">
                        {Math.round((quizResults.score / 5) * 100)}% Accuracy Achieved
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                        Review the questions list below to examine correct answers. Go study and try again!
                      </p>
                    </div>
                  </div>

                  {/* Detailed question-by-question review */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Question Review Summary</h4>
                      <p className="text-[10px] text-slate-500">Detailed answers breakdown for this study session.</p>
                    </div>

                    <div className="space-y-4">
                      {quizResults.review.map((item, idx) => {
                        const isCorrect = item.isCorrect;
                        return (
                          <div 
                            key={item.id}
                            className={`p-5 rounded-2xl border ${
                              isCorrect 
                                ? 'bg-emerald-950/10 border-emerald-900/20' 
                                : 'bg-red-950/10 border-red-900/20'
                            } space-y-4`}
                          >
                            {/* Question Header */}
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-850/40">
                              <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isCorrect ? (
                                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span>Correct</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                                    <XCircle className="h-4 w-4 shrink-0" />
                                    <span>Incorrect</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Question Content */}
                            <p className="text-sm font-bold text-slate-100 leading-relaxed">{item.question}</p>

                            {/* Options review */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {['A', 'B', 'C', 'D'].map((key) => {
                                const optionText = item[`option${key}`];
                                const isUserChoice = item.userAnswer === key;
                                const isCorrectChoice = item.correctAnswer === key;
                                
                                let styleClass = 'border-slate-850/60 bg-slate-950/20 text-slate-400';
                                if (isCorrectChoice) {
                                  styleClass = 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 font-semibold';
                                } else if (isUserChoice && !isCorrect) {
                                  styleClass = 'border-red-500/30 bg-red-950/30 text-red-300 font-semibold';
                                }

                                return (
                                  <div 
                                    key={key}
                                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${styleClass}`}
                                  >
                                    <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                      isCorrectChoice
                                        ? 'bg-emerald-500 text-white'
                                        : isUserChoice && !isCorrect
                                          ? 'bg-red-500 text-white'
                                          : 'bg-slate-900 text-slate-500'
                                    }`}>
                                      {key}
                                    </span>
                                    <span className="leading-relaxed pt-0.5">{optionText}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset trigger */}
                  <div className="pt-6 border-t border-slate-850/80 flex justify-end">
                    <button
                      onClick={handleResetQuiz}
                      className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all duration-200 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Take Another Quiz</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

        </section>

      </main>

      {/* Footer minimal */}
      <footer className="border-t border-slate-900/50 py-6 text-center z-10">
        <p className="text-xs text-slate-500">
          StudyHub AI Mock Simulator MVP - High-performance Exam Simulator.
        </p>
      </footer>
    </div>
  );
}
