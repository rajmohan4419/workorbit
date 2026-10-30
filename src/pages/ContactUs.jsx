import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';

export default function ContactUs() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Contact Us | OrbitBoard';
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !message) return;
    setSubmitted(true);
  };

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
              <Mail size={16} /> Get In Touch
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Contact Us & Support
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Have feedback, tool suggestions, or business inquiries? We'd love to hear from you.
            </p>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-6">
              <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 space-y-4">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <MessageSquare size={18} className="text-accent-600" />
                  Direct Email Support
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-6">
                  For fastest response regarding general support, privacy inquiries, or reporting bugs:
                </p>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800 font-mono text-xs text-accent-700 dark:text-accent-400 font-semibold border border-[var(--orbit-border)]">
                  <a href="mailto:support@orbitboard.in" className="hover:underline">support@orbitboard.in</a>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Response time: Usually within 24-48 business hours.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 space-y-3">
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Tool Request & Feedback</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-5">
                  Is there a calculator or utility you'd like us to add? Send us your requirements and we'll prioritize it in our next release cycle.
                </p>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 sm:p-8">
                {submitted ? (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle size={44} className="mx-auto text-emerald-600" />
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Message Received!</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-300 max-w-sm mx-auto">
                      Thank you for contacting OrbitBoard. Our team will review your message and reach out if necessary.
                    </p>
                    <button onClick={() => setSubmitted(false)} className="mt-4 rounded-xl border border-[var(--orbit-border)] px-4 py-2 text-xs font-semibold hover:border-accent-500">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Send a Message</h2>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm outline-none focus:border-accent-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm outline-none focus:border-accent-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Tool suggestion / Question"
                        className="w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm outline-none focus:border-accent-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Message *</label>
                      <textarea
                        required
                        rows={4}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="How can we help you?"
                        className="w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-4 text-sm outline-none focus:border-accent-500 min-h-[44px]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-semibold py-3 px-5 text-sm transition inline-flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <Send size={16} /> Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <ToolsHomeFooter />
    </div>
  );
}
