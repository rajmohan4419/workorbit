import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { dailyQuiz } from '../data/quickQuiz';
import { trackEvent } from '../lib/analytics';
import { getConsentStatus, COOKIE_CONSENT_EVENT } from '../lib/cookieConsent';

const STORAGE_KEY = 'orbitboard:quiz:last-invite';
const dateKey = () => new Date().toLocaleDateString('en-CA');
const safelyRead = () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };
const safelyWrite = () => { try { localStorage.setItem(STORAGE_KEY, dateKey()); } catch { /* storage disabled */ } };

export function QuickQuiz() {
  const location = useLocation();
  const [mode, setMode] = useState('hidden');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [consent, setConsent] = useState(() => getConsentStatus());
  const [questions] = useState(() => dailyQuiz());

  // Only prompt on exploration pages. Never interrupt a user working inside a tool.
  const eligible = location.pathname === '/' || location.pathname === '/tools';
  useEffect(() => {
    const onConsent = () => setConsent(getConsentStatus());
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!eligible || !consent || safelyRead() === dateKey()) return;
    let timeout;
    let interval;
    let lastActivity = Date.now();
    const activity = () => { lastActivity = Date.now(); };
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivity < 15000) return;
      window.clearInterval(interval);
      safelyWrite();
      setMode(current => current === 'hidden' ? 'invite' : current);
      trackEvent('quick_quiz_invitation_shown');
    };
    const start = () => { timeout = window.setTimeout(() => { check(); interval = window.setInterval(check, 15000); }, 60000); };
    window.addEventListener('pointerdown', activity, { passive: true });
    window.addEventListener('keydown', activity);
    start();
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener('pointerdown', activity);
      window.removeEventListener('keydown', activity);
    };
  }, [eligible, consent]);

  if (mode === 'hidden' || (!eligible && mode === 'invite')) return null;

  const close = () => {
    safelyWrite();
    trackEvent('quick_quiz_dismissed', { stage: mode });
    setMode('hidden');
  };
  const start = () => {
    setIndex(0);
    setAnswers([]);
    setMode('playing');
    trackEvent('quick_quiz_started');
  };
  const current = questions[index];
  const selected = answers[index];
  const answered = selected !== undefined;
  const score = answers.reduce((sum, choice, i) => sum + Number(choice === questions[i].answer), 0);
  const choose = (choice) => {
    if (answered) return;
    setAnswers(previous => [...previous, choice]);
    trackEvent('quick_quiz_answered', { category: current.category, correct: choice === current.answer });
  };
  const next = () => {
    if (index === questions.length - 1) {
      setMode('complete');
      trackEvent('quick_quiz_completed', { score, total: questions.length });
    } else setIndex(value => value + 1);
  };

  return (
    <aside aria-label="OrbitBoard quick quiz" className="fixed bottom-4 right-4 z-[90] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-violet-200 bg-white p-5 text-stone-900 shadow-2xl dark:border-violet-800 dark:bg-stone-900 dark:text-stone-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
          <Sparkles size={19} aria-hidden="true" />
          <strong className="text-sm">OrbitBoard Quick Challenge</strong>
        </div>
        <button type="button" onClick={close} aria-label="Close quick quiz" className="rounded-lg p-1 hover:bg-stone-100 dark:hover:bg-stone-800"><X size={18} /></button>
      </div>
      {mode === 'invite' && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Got a minute? 🧠</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Three quick questions: general knowledge, business and technology. No sign-in required.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={start} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">Play now</button>
            <button type="button" onClick={close} className="rounded-xl border px-4 py-2 text-sm">Not now</button>
          </div>
        </div>
      )}
      {mode === 'playing' && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">{current.category} · Question {index + 1} of {questions.length}</p>
          <h2 className="mt-2 text-base font-bold">{current.question}</h2>
          <div className="mt-3 grid gap-2">
            {current.options.map((option, choice) => (
              <button key={option} type="button" disabled={answered} onClick={() => choose(choice)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${answered && choice === current.answer ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : answered && choice === selected ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-stone-200 hover:border-violet-400 dark:border-stone-700 dark:hover:border-violet-400'}`}>
                {option}
              </button>
            ))}
          </div>
          {answered && (
            <div aria-live="polite" className="mt-3">
              <p className="text-sm font-semibold">{selected === current.answer ? 'Correct! 🎉' : 'Good try!'}</p>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">{current.explanation}</p>
              <button type="button" onClick={next} className="mt-3 flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white">
                {index === questions.length - 1 ? 'See results' : 'Next question'} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
      {mode === 'complete' && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Challenge complete! 🎉</h2>
          <p className="mt-2 text-sm">You scored <strong>{score} out of {questions.length}</strong>.</p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Put your skills to work with a free OrbitBoard tool.</p>
          <Link to={questions[1].tool.href} onClick={() => { trackEvent('quick_quiz_tool_clicked', { destination: questions[1].tool.href }); close(); }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white">
            {questions[1].tool.label} <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </aside>
  );
}
