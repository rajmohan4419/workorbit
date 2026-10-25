import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ChevronDown, ExternalLink, Globe, ShieldCheck, FileText } from 'lucide-react';
import { RazorpayCheckout } from '../RazorpayCheckout';

export function PrivacySection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-8 sm:py-10">
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              <LockKeyhole size={14} /> Your privacy matters
            </div>
            <h2 className="mt-2 text-lg font-bold text-stone-900 dark:text-stone-100 sm:text-xl">Private, secure and free by design.</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">No account is required for our core tools. Many file and data tools process content directly in your browser, helping keep files on your device.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-stone-700 dark:text-stone-300 sm:grid-cols-3 lg:min-w-[440px]">
            {['No sign-up required', 'Browser-first processing', 'Free core utilities'].map(item => (
              <div key={item} className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 px-3 py-3 font-medium min-h-[44px] flex items-center justify-center text-center">
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
    <section className="mx-auto max-w-6xl border-t border-[var(--orbit-border)] py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
            Support & Pro Membership
          </p>
          <h2 className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
            Upgrade to OrbitBoard Pro
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            Support fast, privacy-first web utilities. Get instant access to Pro workspace tools, priority serverless processing, and early access features.
          </p>
        </div>
        <div className="shrink-0 w-full lg:w-auto flex justify-center">
          <RazorpayCheckout
            amount={500}
            title="OrbitBoard Pro Support"
            description="Unlock Pro features and support fast web tools"
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
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">Still exploring?</p>
          <h2 className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">Every tool, when you need it.</h2>
        </div>
        <Link to="/tools" className="inline-flex min-h-[44px] items-center gap-1 self-start rounded-xl px-4 py-2.5 text-sm font-semibold text-violet-800 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition">
          Open full catalogue <ArrowRight size={16} />
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
    { label: 'Developer Utilities', path: '/tools?category=Developer' },
    { label: 'Productivity & Converters', path: '/tools?category=Everyday' },
  ];

  const utilityLinks = [
    { label: 'Privacy Policy', path: '#privacy', icon: ShieldCheck },
    { label: 'Terms of Service', path: '#terms', icon: FileText },
    { label: 'Sitemap', path: '/tools', icon: Globe },
    { label: 'GitHub / Extensions', path: 'https://github.com', external: true, icon: ExternalLink },
  ];

  return (
    <footer className="border-t border-[var(--orbit-border)] bg-[var(--orbit-canvas)] pt-10 pb-8 text-stone-700 dark:text-stone-300 transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Desktop 4-Column Layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Popular Utilities */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 mb-3">Popular Utilities</h3>
            <ul className="space-y-2 text-sm">
              {popularLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="hover:text-violet-700 dark:hover:text-violet-400 transition min-h-[36px] inline-flex items-center">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 mb-3">Categories</h3>
            <ul className="space-y-2 text-sm">
              {categoryLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="hover:text-violet-700 dark:hover:text-violet-400 transition min-h-[36px] inline-flex items-center">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Resources & Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 mb-3">Resources & Legal</h3>
            <ul className="space-y-2 text-sm">
              {utilityLinks.map(link => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.path} target="_blank" rel="noopener noreferrer" className="hover:text-violet-700 dark:hover:text-violet-400 transition min-h-[36px] inline-flex items-center gap-1.5">
                      <link.icon size={15} /> {link.label}
                    </a>
                  ) : (
                    <Link to={link.path} className="hover:text-violet-700 dark:hover:text-violet-400 transition min-h-[36px] inline-flex items-center gap-1.5">
                      <link.icon size={15} /> {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Brand & Contact */}
          <div>
            <Link to="/" className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-100">
              ORBIT<span className="text-violet-600 dark:text-violet-400">BOARD</span>
            </Link>
            <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
              Free, fast, and privacy-first web utilities designed for daily work, career decisions, and developer efficiency.
            </p>
            <div className="mt-4">
              <a
                href="mailto:support@orbitboard.in?subject=OrbitBoard%20Support"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 hover:underline min-h-[44px]"
              >
                support@orbitboard.in
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Accordion & Stacked Layout */}
        <div className="block md:hidden space-y-3">
          <details className="group rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4">
            <summary className="flex items-center justify-between cursor-pointer font-bold text-sm text-stone-900 dark:text-stone-100 list-none min-h-[44px]">
              <span>Popular Utilities</span>
              <ChevronDown size={18} className="transition group-open:rotate-180 text-stone-400" />
            </summary>
            <ul className="mt-3 space-y-2 text-sm border-t border-[var(--orbit-border)] pt-3">
              {popularLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="block py-2 min-h-[44px] flex items-center text-stone-700 dark:text-stone-300 hover:text-violet-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          <details className="group rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4">
            <summary className="flex items-center justify-between cursor-pointer font-bold text-sm text-stone-900 dark:text-stone-100 list-none min-h-[44px]">
              <span>Categories</span>
              <ChevronDown size={18} className="transition group-open:rotate-180 text-stone-400" />
            </summary>
            <ul className="mt-3 space-y-2 text-sm border-t border-[var(--orbit-border)] pt-3">
              {categoryLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="block py-2 min-h-[44px] flex items-center text-stone-700 dark:text-stone-300 hover:text-violet-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          {/* Reachable Utility Links on Mobile */}
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4">
            <p className="font-bold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">Utility Links</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {utilityLinks.map(link => (
                link.external ? (
                  <a key={link.label} href={link.path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 p-2.5 min-h-[44px] rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                    <link.icon size={15} /> {link.label}
                  </a>
                ) : (
                  <Link key={link.label} to={link.path} className="flex items-center gap-1.5 p-2.5 min-h-[44px] rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                    <link.icon size={15} /> {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 border-t border-[var(--orbit-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
          <span>© {new Date().getFullYear()} OrbitBoard • Practical browser tools for modern work.</span>
          <span>Designed with speed and privacy in mind.</span>
        </div>
      </div>
    </footer>
  );
}
