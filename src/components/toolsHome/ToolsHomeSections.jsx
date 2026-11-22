import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ExternalLink, Globe, ShieldCheck, FileText, Heart, Cookie, CreditCard } from 'lucide-react';
import { RazorpayCheckout } from '../RazorpayCheckout';
import { openCookiePreferences } from '../../lib/cookieConsent';

export function PrivacySection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-8 sm:py-10">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <LockKeyhole size={14} /> Client-side calculation & document processing
            </div>
            <h2 className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
              Your files stay on your machine.
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
              All tools run in your browser session. Calculations, PDFs, and spreadsheet data are processed on your device—nothing is sent to our servers for processing. Creating a free account is only required when you want to save download history and export PDF or spreadsheet files.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 text-xs text-stone-700 dark:text-stone-300 sm:grid-cols-3 lg:min-w-[420px]">
            {[
              '100% on-device processing',
              'No account needed to calculate',
              'Sign in only to export files'
            ].map(item => (
              <div key={item} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-3 font-medium min-h-[44px] flex items-center justify-center text-center shadow-2xs">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SupportCheckoutSection() {
  return (
    <section id="support" className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            Independent development
          </p>
          <h2 className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
            Help keep OrbitBoard ad-free & independent
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            All calculators and tools are free. If OrbitBoard helped you calculate taxes, format data, or finish work today, you can make a small one-time contribution to cover hosting costs.
          </p>
        </div>
        <div className="shrink-0 w-full lg:w-auto flex justify-center items-center">
          <RazorpayCheckout
            productId="support-orbitboard"
            amount={500}
            title="OrbitBoard Support"
            description="Help cover hosting and development"
            showAmountSelector={true}
          />
        </div>
      </div>
    </section>
  );
}

export function CatalogCalloutSection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Looking for a specific calculator or converter?</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Explore our complete catalog of 70+ utilities across finance, career, developer tools, and files.</p>
        </div>
        <Link to="/tools" className="inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-800 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition">
          Full catalog <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export function ToolsHomeFooter() {
  const popularLinks = [
    { label: 'Notice Period Calculator', path: '/tools/notice-period' },
    { label: 'Work Experience Calculator', path: '/tools/experience' },
    { label: 'Online Image Compressor', path: '/tools/image-compressor' },
    { label: 'Diff & Code Compare', path: '/tools/diff-checker' },
    { label: 'CTC to In-Hand Salary', path: '/tools/ctc-to-inhand' },
    { label: 'EMI Loan Calculator', path: '/tools/emi' },
  ];

  const categoryLinks = [
    { label: 'Finance & Money', path: '/tools?category=Finance' },
    { label: 'Career & Salary', path: '/tools?category=Career' },
    { label: 'Developer Tools', path: '/tools?category=Developer' },
    { label: 'Productivity & Converters', path: '/tools?category=Everyday' },
  ];

  const utilityLinks = [
    { label: 'Pricing', path: '/pricing', icon: CreditCard },
    { label: 'About Us', path: '/about', icon: Globe },
    { label: 'Privacy Policy', path: '/privacy', icon: ShieldCheck },
    { label: 'Cookie Settings', action: openCookiePreferences, icon: Cookie },
    { label: 'Terms of Service', path: '/terms', icon: FileText },
    { label: 'Contact Us', path: '/contact', icon: Heart },
    { label: 'All Tools', path: '/tools', icon: Globe },
    { label: 'GitHub repository', path: 'https://github.com', external: true, icon: ExternalLink },
  ];

  return (
    <footer className="border-t border-[var(--orbit-border)] bg-[var(--orbit-canvas)] pt-10 pb-8 text-stone-700 dark:text-stone-300 transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Unified 4-Column Layout (Responsive across mobile & desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Popular Tools */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-100 mb-3">
              Popular Tools
            </h3>
            <ul className="space-y-2 text-sm">
              {popularLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="hover:text-stone-900 dark:hover:text-stone-100 transition inline-flex items-center min-h-[32px]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-100 mb-3">
              Categories
            </h3>
            <ul className="space-y-2 text-sm">
              {categoryLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="hover:text-stone-900 dark:hover:text-stone-100 transition inline-flex items-center min-h-[32px]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Resources & Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-100 mb-3">
              Resources & Legal
            </h3>
            <ul className="space-y-2 text-sm">
              {utilityLinks.map(link => (
                <li key={link.label}>
                  {link.action ? (
                    <button
                      type="button"
                      onClick={link.action}
                      className="hover:text-stone-900 dark:hover:text-stone-100 transition inline-flex items-center gap-2 text-left min-h-[32px]"
                    >
                      <link.icon size={15} className="text-stone-400 shrink-0" />
                      <span>{link.label}</span>
                    </button>
                  ) : link.external ? (
                    <a
                      href={link.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-stone-900 dark:hover:text-stone-100 transition inline-flex items-center gap-2 min-h-[32px]"
                    >
                      <link.icon size={15} className="text-stone-400 shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  ) : (
                    <Link
                      to={link.path}
                      className="hover:text-stone-900 dark:hover:text-stone-100 transition inline-flex items-center gap-2 min-h-[32px]"
                    >
                      <link.icon size={15} className="text-stone-400 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: About & Contact */}
          <div>
            <Link to="/" className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Orbit<span className="text-indigo-600 dark:text-indigo-400">Board</span>
            </Link>
            <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
              Private, fast browser utilities for calculations, conversions, and document generation. Built to work directly on your machine.
            </p>
            <div className="mt-4">
              <a
                href="mailto:support@orbitboard.in"
                className="text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline"
              >
                support@orbitboard.in
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 border-t border-[var(--orbit-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
          <span>© {new Date().getFullYear()} OrbitBoard. Free on-device web tools.</span>
          <span>Designed with speed and privacy in mind.</span>
        </div>
      </div>
    </footer>
  );
}
