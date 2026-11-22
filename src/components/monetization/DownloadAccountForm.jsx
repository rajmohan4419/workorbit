import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { useTaskFeedback } from '../../lib/feedback/useTaskFeedback';
import { unlockSound } from '../../lib/feedback/sound';
import { supabase } from '../../lib/supabase';

const OTP_LENGTH = 6;

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function DownloadAccountForm({ onSignedIn }) {
  const feedback = useTaskFeedback('auth');
  const action = useRef(null);
  const popupRef = useRef(null);
  const popupDetached = useRef(false);
  const closePopup = useCallback(() => {
    if (!popupDetached.current) popupRef.current?.close();
  }, []);
  const locked = useRef(false);
  const googlePending = useRef(false);

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return query.has('error') || fragment.has('error') || query.has('error_code') || fragment.has('error_code')
      ? 'Google sign-in was cancelled or could not complete. Please try again.'
      : '';
  });

  useEffect(() => {
    if (!supabase?.auth) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && googlePending.current) {
        googlePending.current = false;
        locked.current = false;
        setBusy(false);
        action.current?.success('You’re signed in.');
        closePopup();
        setMessage('You’re signed in.');
        void Promise.resolve().then(() => onSignedIn?.(session)).catch(() => {});
      }
    });
    return () => data?.subscription?.unsubscribe();
  }, [onSignedIn, closePopup]);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      if (googlePending.current && popupRef.current?.closed) {
        googlePending.current = false;
        locked.current = false;
        setBusy(false);
        const msg = 'Google sign-in was cancelled. Your inputs are still here. Please try again.';
        action.current?.cancel(msg);
        setMessage(msg);
      }
    }, 500);
    return () => {
      clearInterval(timer);
      closePopup();
    };
  }, [closePopup, busy]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [resendCooldown]);

  // Auto-verify when OTP completes
  useEffect(() => {
    if (step === 'otp' && otp.replace(/\s/g, '').length === OTP_LENGTH && !busy) {
      verifyOtp(otp);
    }
  }, [otp, step]);

  async function googleSignIn() {
    if (locked.current) return;
    unlockSound();
    action.current = feedback.begin({ label: 'Connecting to Google', stage: 'Opening secure sign-in' });
    if (!action.current) return;
    setMessage('');
    setError('');
    if (!supabase?.auth) {
      action.current.error('Account service is unavailable. Please retry later.');
      setError('Account service is unavailable on this deployment.');
      return;
    }
    const popup = window.open('about:blank', '_blank', 'popup,width=520,height=720');
    if (!popup) {
      action.current.error('Allow pop-ups to continue with Google, or use email sign-in.');
      setError('Allow pop-ups for OrbitBoard to continue with Google, or use email sign-in below.');
      return;
    }
    popupRef.current = popup;
    popupDetached.current = false;
    locked.current = true;
    setBusy(true);
    googlePending.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/account`,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (!googlePending.current) return;
      if (error) throw error;
      const target = new URL(data?.url);
      if (
        target.protocol !== 'https:' ||
        target.hostname !== new URL(import.meta.env.VITE_SUPABASE_URL).hostname ||
        target.pathname !== '/auth/v1/authorize'
      ) {
        throw new Error('Invalid sign-in destination.');
      }
      if (popup.closed) throw new Error('Google sign-in window was closed. Please retry.');
      popup.location.replace(target.href);
      popup.opener = null;
      popupDetached.current = true;
      action.current?.stage('Waiting for Google sign-in to complete');
      setMessage('Complete Google sign-in in the new window, then return here. Your generated file stays in this tab.');
    } catch {
      googlePending.current = false;
      locked.current = false;
      setBusy(false);
      action.current?.error('Google sign-in could not start. Please retry or use email sign-in.');
      closePopup();
      setError('Google sign-in could not start. Please retry or use email sign-in.');
    }
  }

  async function sendOtp(targetEmail) {
    if (!supabase?.auth) {
      throw new Error('Account service is unavailable on this deployment. You can continue using tools without signing up.');
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      email: targetEmail.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    if (err) throw err;
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (locked.current) return;
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    unlockSound();
    action.current = feedback.begin({ label: 'Sending verification code', stage: 'Sending code' });
    if (!action.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await sendOtp(email);
      action.current.success('Verification code sent.');
      setStep('otp');
      setResendCooldown(60);
      setMessage(`We emailed a 6-digit code to ${email}.`);
    } catch (err) {
      action.current?.error('Could not send code. Please try again.');
      setError(err.message || 'Could not send verification code. Please try again.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function verifyOtp(code) {
    if (locked.current) return;
    unlockSound();
    action.current = feedback.begin({ label: 'Verifying code', stage: 'Checking code' });
    if (!action.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (!supabase?.auth) throw new Error('Account service is unavailable.');
      const { data, error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (err) throw err;
      if (data?.session) {
        action.current.success('You’re signed in.');
        setMessage('You’re signed in.');
        void Promise.resolve().then(() => onSignedIn?.(data.session)).catch(() => {});
      } else {
        throw new Error('Verification did not return an active session.');
      }
    } catch (err) {
      action.current?.error('Invalid or expired code.');
      setOtp('');
      setError(
        err.message?.includes('expired') || err.message?.includes('invalid')
          ? 'That code is invalid or has expired. Please request a new one.'
          : err.message || 'Could not verify code. Please try again.'
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || busy) return;
    setError('');
    setMessage('');
    setOtp('');
    setBusy(true);
    try {
      await sendOtp(email);
      setResendCooldown(60);
      setMessage('A new verification code was sent to your email.');
    } catch (err) {
      setError(err.message || 'Could not resend code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const cancelGoogle = () => {
    if (!googlePending.current) return;
    googlePending.current = false;
    locked.current = false;
    closePopup();
    setBusy(false);
    action.current?.cancel('Sign-in cancelled. Your inputs are still here.');
    setMessage('Sign-in cancelled here. Close the Google window to stop sign-in, then try again when ready.');
  };

  return (
    <div className="space-y-4 text-left">
      <div>
        <h2 className="text-xl font-bold">
          {step === 'email' ? 'Sign up to download' : 'Enter verification code'}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Use tools free without an account. Sign up with OTP to download PDF/XLSX files and track your usage. PDF downloads cost ₹0.25 each using prepaid credits; minimum top-up ₹100.
        </p>
      </div>

      <button
        type="button"
        onClick={googleSignIn}
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
      >
        <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span>
        Continue with Google
      </button>

      {busy && googlePending.current && (
        <button
          type="button"
          className="text-sm text-violet-700 underline"
          onClick={cancelGoogle}
          disabled={feedback.stage !== 'Waiting for Google sign-in to complete' && feedback.stage !== 'Opening secure sign-in'}
        >
          Cancel Google sign-in
        </button>
      )}

      <p className="text-xs text-stone-500">Opens in a new window to keep your current work open.</p>

      <div className="text-center text-sm text-stone-500">
        {step === 'email' ? 'or continue with email OTP' : 'verify with OTP'}
      </div>

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              className="orbit-control mt-1 w-full border rounded-lg"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Please wait…' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              6-digit OTP code sent to <span className="font-semibold text-stone-800">{email}</span>
              <input
                className="orbit-control mt-1 w-full border rounded-lg text-center font-mono text-lg tracking-widest"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                placeholder="123456"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => verifyOtp(otp)}
            disabled={busy || otp.length < OTP_LENGTH}
            className="min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Verifying…' : 'Verify & Continue'}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || busy}
              className="text-indigo-700 underline disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError('');
                setMessage('');
              }}
              disabled={busy}
              className="text-stone-600 underline"
            >
              Change email
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-indigo-700">{message}</p>}

      <p className="text-xs text-stone-600">
        We record download format, tool and time against your account, not document contents.{' '}
        <Link to="/privacy" target="_blank" className="underline">Privacy policy</Link>
      </p>
    </div>
  );
}
