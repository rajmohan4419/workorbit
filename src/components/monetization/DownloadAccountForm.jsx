import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function DownloadAccountForm({ onSignedIn }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      if (!supabase?.auth) throw new Error('Account service is unavailable on this deployment. You can continue using tools without signing up.');
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data?.session) onSignedIn?.(result.data.session);
      else setMessage('Check your email to confirm your account, then sign in here. Keep this tab open to retain your generated file.');
    } catch (err) { setError(err.message || 'Could not sign in. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4 text-left">
    <h2 className="text-xl font-bold">{mode === 'signup' ? 'Sign up to download' : 'Sign in to download'}</h2>
    <p className="text-sm text-stone-600">Use tools free without an account. Sign up for PDF/XLSX downloads and track your usage. PDF downloads cost ₹0.25 each using prepaid credits; minimum top-up ₹100.</p>
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
