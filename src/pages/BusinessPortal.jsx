import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const field = 'orbit-control w-full rounded-xl border border-stone-300 bg-white text-stone-900 outline-none focus:border-indigo-600';
const button = 'w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50';
const card = 'mx-auto w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9';

function Shell({ title, subtitle, children }) {
  return <main className="min-h-screen bg-[#f8f7ff] px-4 py-12 text-stone-900">
    <div className={card}><Link to="/" className="text-sm font-bold text-indigo-600">← OrbitBoard</Link>
      <h1 className="mt-5 text-3xl font-bold">{title}</h1><p className="mt-2 mb-6 text-stone-600">{subtitle}</p>{children}</div>
  </main>;
}
function useSession() {
  const [session, setSession] = useState(() => (supabase ? undefined : null));
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  return session;
}
function ErrorText({ message }) { return message ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null; }

export function BusinessAuth({ mode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isSignup = mode === 'signup';
  const redirect = params.get('next') === '/pricing' ? '/pricing' : '/business/dashboard';
  if (session === undefined) return <Shell title="Checking session…" subtitle="Please wait." />;
  if (session) return <Navigate to={redirect} replace />;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (!supabase) throw new Error('Supabase is not configured for this deployment.');
      const result = isSignup
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/business/dashboard' } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (isSignup && !result.data.session) setMessage('Check your email to confirm your account, then sign in.');
      else navigate(redirect, { replace: true });
    } catch (err) { setError(err.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  }
  return <Shell title={isSignup ? 'Create your account' : 'Welcome back'} subtitle="One OrbitBoard account for all your businesses.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">Email<input className={field + ' mt-1'} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block text-sm font-medium">Password<input className={field + ' mt-1'} type="password" minLength={6} autoComplete={isSignup ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button className={button} disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
    </form>
    <ErrorText message={error} />{message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
    <p className="mt-5 text-sm text-stone-600">{isSignup ? 'Already registered?' : 'New to OrbitBoard?'} <Link className="font-semibold text-indigo-600" to={isSignup ? '/business/login' : '/business/signup'}>{isSignup ? 'Sign in' : 'Create account'}</Link></p>
  </Shell>;
}
export function BusinessDashboard() {
  const session = useSession();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) {
      Promise.resolve().then(() => {
        setBusinesses([]);
        setLoading(true);
      });
      return;
    }
    let active = true;
    supabase.from('business_profiles').select('id,name,business_type,gstin,created_at').order('created_at', { ascending: false })
      .then(({ data, error: err }) => { if (!active) return; setBusinesses(data || []); setError(err?.message || ''); setLoading(false); });
    return () => { active = false; };
  }, [session]);
  if (session === undefined) return <Shell title="Loading…" subtitle="Checking your session." />;
  if (!session) return <Navigate to="/business/login" replace />;
  return <Shell title="Your businesses" subtitle={session.user.email}>
    <Link to="/business/onboarding" className="mb-5 inline-block rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">+ Add business</Link>
    <ErrorText message={error} />
    {loading ? <p>Loading businesses…</p> : businesses.length ? <ul className="space-y-3">{businesses.map(b => <li key={b.id} className="rounded-xl border border-stone-200 p-4"><strong>{b.name}</strong><p className="text-sm text-stone-600">{b.business_type}{b.gstin ? ' · GSTIN: ' + b.gstin : ''}</p></li>)}</ul> : !error && <p className="rounded-xl bg-indigo-50 p-4 text-sm">No businesses yet. Create your first business profile.</p>}
    <button className="mt-8 text-sm text-stone-600 underline" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}>Sign out</button>
  </Shell>;
}
export function BusinessOnboarding() {
  const session = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', type: 'proprietorship', gstin: '', state: '', address: '', upi: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (session === undefined) return <Shell title="Loading…" />;
  if (!session) return <Navigate to="/business/login" replace />;
  const change = (key) => (e) => setForm(old => ({ ...old, [key]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { error: err } = await supabase.rpc('create_business_profile', {
        p_name: form.name.trim(), p_type: form.type, p_gstin: form.gstin.trim() || null,
        p_state_code: form.state.trim() || null, p_address: form.address.trim() || null,
        p_upi_id: form.upi.trim() || null,
      });
      if (err) throw err;
      navigate('/business/dashboard', { replace: true });
    } catch (err) { setError(err.message || 'Could not create business.'); }
    finally { setBusy(false); }
  }
  return <Shell title="Set up your business" subtitle="Save your details once. Reuse them across invoices and business tools.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">Business name *<input className={field + ' mt-1'} required minLength={2} maxLength={160} value={form.name} onChange={change('name')} /></label>
      <label className="block text-sm font-medium">Business type<select className={field + ' mt-1'} value={form.type} onChange={change('type')}>{[['proprietorship','Proprietorship'],['partnership','Partnership'],['llp','LLP'],['private_limited','Private limited'],['public_limited','Public limited'],['other','Other']].map(([v,t]) => <option key={v} value={v}>{t}</option>)}</select></label>
      <label className="block text-sm font-medium">GSTIN (optional)<input className={field + ' mt-1 uppercase'} maxLength={15} pattern="[0-9]{2}[A-Za-z0-9]{13}" value={form.gstin} onChange={change('gstin')} placeholder="15-character GSTIN" /></label>
      <label className="block text-sm font-medium">State code (optional)<input className={field + ' mt-1'} maxLength={2} value={form.state} onChange={change('state')} /></label>
      <label className="block text-sm font-medium">Business address (optional)<textarea className={field + ' mt-1'} rows={3} value={form.address} onChange={change('address')} /></label>
      <label className="block text-sm font-medium">UPI ID (optional)<input className={field + ' mt-1'} value={form.upi} onChange={change('upi')} /></label>
      <button className={button} disabled={busy}>{busy ? 'Saving…' : 'Create business profile'}</button>
    </form><ErrorText message={error} /><Link className="mt-5 inline-block text-sm text-indigo-600" to="/business/dashboard">Back to dashboard</Link>
  </Shell>;
}
