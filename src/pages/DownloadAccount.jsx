import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DownloadAccountForm } from '../components/monetization/DownloadAccountForm';
import { PdfTopup } from '../components/monetization/PdfTopup';
import { useAccountSession } from '../lib/monetization/useAccountSession';
import { supabase } from '../lib/supabase';

export default function DownloadAccount() {
  const { session, loading } = useAccountSession();
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!session?.access_token) return;
    const controller = new AbortController();
    fetch('/api/downloads', { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Download usage is temporarily unavailable.'); const body = await response.json(); if (!body.pdf) throw new Error('Download balance is temporarily unavailable.'); return body; })
      .then(data => { if (!controller.signal.aborted) { setUsage({ owner: session.user.id, ...data }); setError(''); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [session, revision]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('orbitboard:download-recorded',refresh);
    document.addEventListener('visibilitychange',visible);
    return () => { window.removeEventListener('orbitboard:download-recorded',refresh); document.removeEventListener('visibilitychange',visible); };
  }, []);
  useEffect(() => {
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.append(robots);
    const title = document.title; document.title = 'Download account | OrbitBoard';
    return () => { robots.remove(); document.title = title; };
  }, []);
  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-stone-900">
    <Link to="/" className="text-indigo-700 underline">← Back to free tools</Link>
    <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
      {loading ? <p role="status">Checking account…</p> : !session || session.user?.is_anonymous ? <DownloadAccountForm /> : <>
        <h1 className="text-2xl font-bold">Your download account</h1>
        <p className="mt-2 text-sm">Signed in as {session.user?.email}</p>
        {usage?.owner === session.user?.id ? <>
          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Purchased PDF limit',usage.pdf.purchased],['PDF credits used',usage.pdf.used],['PDF downloads remaining',usage.pdf.remaining]].map(([label,value]) => <div key={label} className="rounded-xl border border-stone-200 p-4"><dt className="text-sm text-stone-600">{label}</dt><dd className="mt-2 text-2xl font-bold">{value.toLocaleString('en-IN')}</dd></div>)}</dl>
          <p className="mt-3 text-sm">{usage.downloads} PDF/XLSX download initiations this month (UTC). Historical pilot downloads are not charged against your purchased credits.</p>
        </> : <p role="status" className="mt-4">{error ? 'Usage could not load.' : 'Loading download usage…'}</p>}
        <p className="mt-2 text-sm text-stone-600">On-screen tools are free without an account. PDF downloads use one prepaid credit per file. XLSX downloads remain in the account usage pilot. A download initiation does not confirm that the file was saved to your device.</p>
        <PdfTopup key={session.user.id} onPaid={() => setRevision(value => value + 1)} />
        {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
        <div className="mt-4 flex gap-4"><button type="button" onClick={() => setRevision(value => value + 1)} className="min-h-11 text-indigo-700 underline">Refresh usage</button>
          <button type="button" onClick={async () => { const result = await supabase.auth.signOut(); if (result.error) setError('Could not sign out. Please retry.'); }} className="min-h-11 underline">Sign out</button></div>
      </>}
    </div>

  </main>;
}
