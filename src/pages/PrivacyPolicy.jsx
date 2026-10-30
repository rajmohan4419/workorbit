import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, LockKeyhole, Eye, Cookie, Server } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy | OrbitBoard';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex">
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <ToolsHomeHeader />

        <div className="border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)] py-8 sm:py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 dark:text-accent-400 hover:underline mb-4">
              <ArrowLeft size={14} /> Back to OrbitBoard
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <ShieldCheck size={16} /> Data Protection & Privacy
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Last updated: October 2026 • Effective for all OrbitBoard tools and services.
            </p>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-5 sm:p-6 space-y-3">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <LockKeyhole size={18} className="text-emerald-600 dark:text-emerald-400" />
              Privacy-First Philosophy
            </h2>
            <p className="text-sm leading-6 text-stone-700 dark:text-stone-300">
              OrbitBoard is designed with a strict browser-first architecture. The core online tools (including calculators, JSON formatters, PDF processing, unit converters, and diff tools) execute client-side in your web browser. Your inputs, uploaded files, documents, and calculation parameters remain on your local device and are not uploaded or stored on our servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Server size={18} className="text-accent-600" />
              Information We Collect & Process
            </h2>
            <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300 leading-7">
              <p>
                <strong>1. Client-Side Tool Data:</strong> Data processed within interactive tools (such as financial amounts, salary CTC figures, JSON strings, PDF files, image uploads, and text) is processed entirely within WebAssembly / JavaScript in your web browser. We do not transmit or store this data on our servers.
              </p>
              <p>
                <strong>2. Anonymous Usage Analytics & Telemetry:</strong> We collect aggregate, privacy-preserving telemetry (e.g. tool open events and visitor counts) to monitor site availability, performance, and general utility popularity. This data does not contain personally identifiable information (PII).
              </p>
              <p>
                <strong>3. Local Storage:</strong> OrbitBoard uses your browser’s local storage (<code>localStorage</code>) to save non-sensitive user preferences such as favorited tools and recently used workflows. This data is stored strictly on your device and can be cleared by you at any time.
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Cookie size={18} className="text-accent-600" />
              Advertising & Third-Party Vendors (Google AdSense)
            </h2>
            <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300 leading-7">
              <p>
                OrbitBoard partners with Google AdSense to serve advertisements on our platform. AdSense helps us keep our comprehensive set of developer, career, and financial tools free for everyone.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Third-party vendors, including Google, use cookies to serve ads based on a user’s prior visits to OrbitBoard or other websites.</li>
                <li>Google’s use of advertising cookies enables it and its partners to serve ads to users based on their visit to OrbitBoard and/or other sites on the Internet.</li>
                <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-accent-600 underline">Google Ad Settings</a>. Alternatively, users can opt out of third-party vendor use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-accent-600 underline">aboutads.info</a>.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Eye size={18} className="text-accent-600" />
              Children's Privacy & Data Protection Rights
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              OrbitBoard does not knowingly collect or solicit personal information from children under the age of 13. If you believe that your child has provided us with personal information, please contact us immediately at <a href="mailto:support@orbitboard.in" className="text-accent-600 font-semibold underline">support@orbitboard.in</a> and we will take prompt action to remove such information.
            </p>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Contact Us Regarding Privacy
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              If you have any questions, suggestions, or concerns regarding this Privacy Policy or our data handling practices, please contact our privacy team at:
            </p>
            <div className="p-4 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 font-mono text-sm text-stone-800 dark:text-stone-200">
              Email: <a href="mailto:support@orbitboard.in" className="text-accent-600 underline">support@orbitboard.in</a>
            </div>
          </section>
        </main>
      </div>

      <ToolsHomeFooter />
      </div>
    </div>
  );
}
