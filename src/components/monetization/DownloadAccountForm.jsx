import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTaskFeedback } from '../../lib/feedback/useTaskFeedback';
import { unlockSound } from '../../lib/feedback/sound';
import { supabase } from '../../lib/supabase';

export function DownloadAccountForm({ onSignedIn }) {
  const feedback = useTaskFeedback('auth');
  const action = useRef(null);
  const popupRef = useRef(null);
  const popupDetached = useRef(false);
  const closePopup = useCallback(() => {
    // Browsers reject parent-driven close/navigation after opener is severed.
    if (!popupDetached.current) popupRef.current?.close();
  }, []);
  const locked = useRef(false);
  const googlePending = useRef(false);
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return query.has('error') || fragment.has('error') || query.has('error_code') || fragment.has('error_code') ? 'Google sign-in was cancelled or could not complete. Please try again.' : '';
  });
  useEffect(() => {
    if (!supabase?.auth) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && googlePending.current) {
        googlePending.current = false;
        locked.current = false; setBusy(false);
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
        googlePending.current = false; locked.current = false; setBusy(false);
        const message = 'Google sign-in was cancelled. Your inputs are still here. Please try again.';
        action.current?.cancel(message); setMessage(message);
      }
    }, 500);
    return () => { clearInterval(timer); closePopup(); };
  }, [closePopup, busy]);
  async function googleSignIn() {
    if (locked.current) return;
    unlockSound();
    action.current = feedback.begin({ label: 'Connecting to Google', stage: 'Opening secure sign-in' });
    if (!action.current) return;
    setMessage(''); setError('');
    if (!supabase?.auth) { action.current.error('Account service is unavailable. Please retry later.'); setError('Account service is unavailable on this deployment.'); return; }
    // Open synchronously from the click; retain the generated document in this tab.
    const popup = window.open('about:blank', '_blank', 'popup,width=520,height=720');
    if (!popup) { action.current.error('Allow pop-ups to continue with Google, or use email sign-in.'); setError('Allow pop-ups for OrbitBoard to continue with Google, or use email sign-in below.'); return; }
    popupRef.current = popup;
    popupDetached.current = false;
    locked.current = true;
    setBusy(true); googlePending.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/account`, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
      });
      if (!googlePending.current) return;
      if (error) throw error;
      const target = new URL(data?.url);
      // Only navigate the popup to this application's Supabase OAuth endpoint.
      if (target.protocol !== 'https:' || target.hostname !== new URL(import.meta.env.VITE_SUPABASE_URL).hostname || target.pathname !== '/auth/v1/authorize') throw new Error('Invalid sign-in destination.');
      if (popup.closed) throw new Error('Google sign-in window was closed. Please retry.');
      popup.location.replace(target.href);
      // Sever the opener after initiating the trusted navigation. Doing this
      // before navigation makes Chromium reject a formerly related popup.
      popup.opener = null;
      popupDetached.current = true;
      action.current?.stage('Waiting for Google sign-in to complete');
      setMessage('Complete Google sign-in in the new window, then return here. Your generated file stays in this tab.');
    } catch {
      googlePending.current = false; locked.current = false; setBusy(false);
      action.current?.error('Google sign-in could not start. Please retry or use email sign-in.');
      closePopup();
      setError('Google sign-in could not start. Please retry or use email sign-in.');
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (locked.current) return;
    unlockSound();
    action.current = feedback.begin({ label: 'Signing in', stage: 'Checking your account' });
    if (!action.current) return;
    locked.current = true;
    setBusy(true); setMessage(''); setError('');
    try {
      if (!supabase?.auth) throw new Error('Account service is unavailable on this deployment. You can continue using tools without signing up.');
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data?.session) { action.current.success('You’re signed in.'); void Promise.resolve().then(() => onSignedIn?.(result.data.session)).catch(() => {}); }
      else { action.current.cancel('Check your email to confirm your account.'); setMessage('Check your email to confirm your account, then sign in here. Keep this tab open to retain your generated file.'); }
    } catch (err) { action.current?.error('Could not sign in. Please try again.'); setError(err.message || 'Could not sign in. Please try again.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <div className="space-y-4 text-left">
    <h2 className="text-xl font-bold">{mode === 'signup' ? 'Sign up to download' : 'Sign in to download'}</h2>
    <p className="text-sm text-stone-600">Use tools free without an account. Sign up for PDF/XLSX downloads and track your usage. PDF downloads cost ₹0.25 each using prepaid credits; minimum top-up ₹100.</p>
    <button type="button" onClick={googleSignIn} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50">
      <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span> Continue with Google
    </button>
    {busy && <button type="button" className="text-sm text-violet-700 underline" onClick={() => {
      if (!googlePending.current) return;
      googlePending.current = false; locked.current = false; closePopup(); setBusy(false);
      action.current?.cancel('Sign-in cancelled. Your inputs are still here.'); setMessage('Sign-in cancelled here. Close the Google window to stop sign-in, then try again when ready.');
    }} disabled={feedback.stage !== 'Waiting for Google sign-in to complete' && feedback.stage !== 'Opening secure sign-in'}>Cancel Google sign-in</button>}
    <p className="text-xs text-stone-500">Opens in a new window to keep your current work open.</p>
    <div className="text-center text-sm text-stone-500">or continue with email</div>
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-medium">Email<input className="orbit-control mt-1 w-full border rounded-lg" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="block text-sm font-medium">Password<input className="orbit-control mt-1 w-full border rounded-lg" type="password" minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button type="submit" className="min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account & continue' : 'Sign in & continue'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-indigo-700">{message}</p>}
    <button type="button" className="text-sm text-indigo-700 underline" disabled={busy} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }}>{mode === 'signup' ? 'Already registered? Sign in' : 'New here? Create an account'}</button>
    <p className="text-xs text-stone-600">We record download format, tool and time against your account, not document contents. <Link to="/privacy" target="_blank" className="underline">Privacy policy</Link></p>
  </div>;
}
