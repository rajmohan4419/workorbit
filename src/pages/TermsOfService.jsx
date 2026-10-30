import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service | OrbitBoard';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex flex-col justify-between">
      <div>
        <ToolsHomeHeader />

        <div className="border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)] py-8 sm:py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 dark:text-accent-400 hover:underline mb-4">
              <ArrowLeft size={14} /> Back to OrbitBoard
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
              <FileText size={16} /> Legal Terms & Conditions
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Last updated: October 2026 • Please read these terms carefully before using OrbitBoard.
            </p>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent-600" />
              1. Acceptance of Terms
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              By accessing or using OrbitBoard (located at <code>https://orbitboard.in</code>), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <FileText size={18} className="text-accent-600" />
              2. Description of Utilities & Services
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              OrbitBoard provides a suite of free web-based utilities for career, business, financial calculations, document/image conversion, and developer workflows. The utilities run client-side in the user’s browser. We reserve the right to modify, update, or discontinue any tool or feature at any time without prior notice.
            </p>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              3. Disclaimer of Financial, Tax & Legal Advice
            </h2>
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-sm leading-6 text-stone-700 dark:text-stone-300 space-y-2">
              <p>
                Calculations provided by financial, tax, salary, loan, and investment tools on OrbitBoard are for informational and educational estimation purposes only. They do not constitute official accounting, tax, or legal advice.
              </p>
              <p>
                Actual payroll deductions, tax liabilities, or loan amortization schedules may vary depending on official government regulations, individual employer policies, and specific contract terms. Always consult a certified financial planner, Chartered Accountant, or tax professional before making financial decisions.
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldAlert size={18} className="text-accent-600" />
              4. Limitation of Liability
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              In no event shall OrbitBoard or its maintainers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the tools on OrbitBoard, even if notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              5. Governing Law & Contact
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              These terms shall be governed by and construed in accordance with the laws of India. Any questions regarding these terms should be directed to <a href="mailto:support@orbitboard.in" className="text-accent-600 font-semibold underline">support@orbitboard.in</a>.
            </p>
          </section>
        </main>
      </div>

      <ToolsHomeFooter />
    </div>
  );
}
