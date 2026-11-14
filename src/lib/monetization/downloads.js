import { supabase } from '../supabase';

export async function authorizeDocumentDownload({ requestId, format, toolSlug }) {
  if (!supabase?.auth) throw new Error('Account service is unavailable. Your file remains in this tab.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    const err = new Error('Sign in to continue your download.'); err.code = 'sign_in_required'; throw err;
  }
  const response = await fetch('/api/downloads', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ requestId, format, toolSlug }),
  });
  const body = await response.json();
  if (!response.ok) {
    const err = new Error(response.status === 402 ? 'Your PDF credits are used up. Top up your account to continue; your file remains in this tab.' : response.status === 401 ? 'Sign in again to continue.' : 'Could not record the download. Please retry; your file remains in this tab.');
    err.code = body.error; throw err;
  }
  if (body.allowed !== true) throw new Error('Download was not authorised. Please retry.');
  return body;
}
