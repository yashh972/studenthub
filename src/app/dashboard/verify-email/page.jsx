'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  Mail, 
  Send, 
  RotateCcw, 
  LogOut, 
  CheckCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

export default function VerifyEmailPage() {
  const { user, verifySession, logout } = useAuth();
  const router = useRouter();

  // 6 separate digit input states
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Resend OTP countdown states
  const [cooldown, setCooldown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  // References to input nodes for auto-tabbing
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // 1. Run countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 2. Handle numeric entry & focus jumping
  const handleDigitChange = (index, value) => {
    // Keep only the last character entered
    const val = value.slice(-1);
    
    // Only allow numbers
    if (val && !/^\d$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);
    setError('');

    // Auto-focus next input field if digit is entered
    if (val && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  // 3. Handle backspace focus backtracking
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Backtrack focus if field is already empty
        inputRefs[index - 1].current.focus();
      } else {
        // Clear active digit
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  // 4. Handle OTP Code verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please input all 6 digits of the verification code.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP code.');
      }

      setSuccess('Account verified successfully!');
      
      // Update local AuthContext user state dynamically with verified status
      if (data.user) {
        verifySession(data.user);
      }

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);

    } catch (err) {
      setError(err.message);
      // Highlight code fields on error
      setDigits(['', '', '', '', '', '']);
      inputRefs[0].current.focus();
    } finally {
      setFormLoading(false);
    }
  };

  // 5. Handle Resend OTP
  const handleResendOTP = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/resend-otp', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setSuccess('A new 6-digit verification code has been logged to your inbox.');
      setCooldown(60); // Reset timer cooldown
      setDigits(['', '', '', '', '', '']);
      inputRefs[0].current.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  // 6. Handle Paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Only process if it is exactly 6 digits

    const pastedDigits = pastedData.split('');
    setDigits(pastedDigits);
    setError('');
    inputRefs[5].current.focus();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden items-center justify-center px-4">
      {/* Background soft glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[180px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-md p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-8 animate-in fade-in zoom-in-95 duration-250">
        
        {/* Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-500/15">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Verify Your Account</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              We have sent a 6-digit numeric verification OTP to your email: <br />
              <strong className="text-violet-400 font-bold">{user?.email || 'your address'}</strong>
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/30 border border-red-900/45 text-red-300 text-xs leading-relaxed animate-in fade-in duration-200">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/45 text-emerald-300 text-xs leading-relaxed animate-in fade-in duration-200">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Enter Verification Code
            </label>
            
            {/* 6 Digit Inputs grid */}
            <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={formLoading}
                  className="w-11 h-13 rounded-xl border border-slate-800 bg-slate-950 text-center text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all font-mono disabled:opacity-40"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading || digits.some(d => !d)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-violet-500/15 hover:shadow-violet-500/25 transition-all duration-200 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {formLoading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Verify OTP Code</span>
              </>
            )}
          </button>
        </form>

        {/* Footer controls: Resend and Logout */}
        <div className="flex flex-col items-center gap-4 pt-2 border-t border-slate-850">
          {/* Resend trigger */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Didn't receive the email?</span>
            <button
              onClick={handleResendOTP}
              disabled={cooldown > 0 || resendLoading}
              className={`font-bold transition cursor-pointer flex items-center gap-1 focus:outline-none ${
                cooldown > 0 || resendLoading
                  ? 'text-slate-650 cursor-not-allowed'
                  : 'text-violet-400 hover:text-violet-300'
              }`}
            >
              {resendLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              <span>
                {cooldown > 0 
                  ? `Resend in ${cooldown}s` 
                  : 'Resend OTP'
                }
              </span>
            </button>
          </div>

          {/* Secure Logout link */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out / Change Email</span>
          </button>
        </div>

      </div>
    </div>
  );
}
