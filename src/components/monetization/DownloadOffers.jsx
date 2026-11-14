import { Link } from 'react-router-dom';
import { useAccountSession } from '../../lib/monetization/useAccountSession';
export function DownloadOffers() {
  const {session} = useAccountSession();
  const signedIn = session && !session.user?.is_anonymous;
  return <section aria-label="PDF download credits" className="my-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 text-stone-900">
    <h2 className="text-lg font-bold">PDF downloads at ₹0.25 each</h2>
    <p className="mt-2">Choose your top-up amount from ₹100. A ₹100 top-up gives 400 PDF downloads. On-screen tools remain free without sign-up.</p>
    <Link to="/account#pdf-topup" className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white">{signedIn ? 'View account & top up' : 'Sign up / Sign in to top up'}</Link>
  </section>;
}
