import { DOWNLOAD_OFFERS } from '../../lib/monetization/planCatalog';

export function DownloadOffers() {
  return <section aria-label="Upcoming download options" className="my-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 text-stone-900">
    <h2 className="text-lg font-bold">Flexible PDF & XLSX download options</h2>
    <p className="mt-2 text-sm">Weekly access and optional top-ups are being prepared. Prices, validity and weekly allowance will be published before checkout is enabled.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{DOWNLOAD_OFFERS.map(offer => <article key={offer.code} className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-semibold">{offer.name}</h3>
      <p className="mt-2 text-sm">{offer.downloads ? `${offer.downloads} PDF/XLSX files combined. Each exported file uses one download.` : '7-day access. Download allowance to be confirmed.'}</p>
      <p className="mt-2 text-xs text-stone-600">{offer.kind === 'top_up' ? 'Add-on pack · validity to be confirmed' : 'Billing and renewal terms to be confirmed'}</p>
      <button type="button" disabled className="mt-3 min-h-11 rounded-lg bg-stone-100 px-3 text-sm text-stone-600">Pricing pending</button>
    </article>)}</div>
  </section>;
}
