import { useRef, useState } from 'react';
import { useTaskFeedback } from '../../lib/feedback/useTaskFeedback';
import { unlockSound } from '../../lib/feedback/sound';
import { supabase } from '../../lib/supabase';
import { loadRazorpayScript } from '../../lib/razorpay';
import { parseTopupAmount } from '../../lib/monetization/pdfCredits';

export function PdfTopup({ onPaid }) {
  const feedback = useTaskFeedback('payment');
  const action = useRef(null);
  const checkoutPending = useRef(false);
  const verifying = useRef(false);
  const completed = useRef(new Set());
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const quote = parseTopupAmount(amount);
  async function request(path, body) {
    const {data,error} = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) throw new Error('Sign in again before topping up.');
    const response = await fetch(path, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Payment could not be confirmed.');
    return result;
  }
  async function verify(payment) {
    const paymentId = payment?.razorpay_payment_id;
    if (verifying.current || completed.current.has(paymentId)) return;
    verifying.current = true;
    unlockSound();
    const task = action.current?.active() ? action.current : feedback.begin({ label: 'Confirming your payment', stage: 'Verifying payment and adding credits' });
    action.current = task;
    task?.stage('Verifying payment and adding credits');
    setBusy(true); setPending(payment);
    try {
      const result = await request('/api/verify-payment', payment);
      if (result.success !== true || result.payment_captured !== true || result.credits_granted !== true) throw new Error('Payment confirmation is pending.');
      completed.current.add(paymentId);
      setPending(null); setMessage('Payment confirmed. Credits added.');
      task?.success('Payment confirmed. Credits added.');
      // A refresh failure cannot turn an already fulfilled payment into a failure.
      void Promise.resolve().then(() => onPaid?.()).catch(() => {});
    } catch {
      const message = 'Payment confirmation is pending. Retry confirmation or refresh usage shortly. Do not pay again for this top-up.';
      setMessage(message); task?.error(message);
    } finally { verifying.current = false; checkoutPending.current = false; setBusy(false); }
  }
  async function checkout(event) {
    event.preventDefault();
    if (!quote || checkoutPending.current || pending) return;
    unlockSound();
    const task = feedback.begin({ label: 'Preparing secure checkout', stage: 'Creating your top-up order' });
    if (!task) return;
    action.current = task;
    checkoutPending.current = true;
    setBusy(true); setMessage('');
    let callbackReceived = false;
    try {
      if (!await loadRazorpayScript()) throw new Error('Razorpay could not load. Please retry.');
      const order = await request('/api/create-order', {purchaseType:'pdf_topup',amountRupees:amount});
      if (!task.active()) return;
      const razorpay = new window.Razorpay({
        key:order.key_id,order_id:order.order_id,amount:order.amount,currency:'INR',name:'OrbitBoard',description:`${order.credits} PDF downloads`,
        handler:payment => {
          if (callbackReceived) return;
          callbackReceived = true;
          void verify(payment);
        },
        modal:{ondismiss:() => {
          if (callbackReceived || !task.active()) return;
          checkoutPending.current = false; setBusy(false);
          const message = 'Checkout closed. Refresh usage if a payment is still processing.';
          setMessage(message); task.cancel(message);
        }},
        theme:{color:'#7c3aed'},
      });
      razorpay.on('payment.failed', () => {
        if (callbackReceived || !task.active()) return;
        checkoutPending.current = false; setBusy(false);
        const message = 'Payment did not complete. Please retry or check your account before paying again.';
        setMessage(message); task.error(message);
      });
      task.stage('Complete payment in the secure checkout window');
      razorpay.open();
    } catch (error) {
      setMessage(error.message); task.error(error.message);
      checkoutPending.current = false; setBusy(false);
    }
  }
  return <section id="pdf-topup" className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5" aria-labelledby="pdf-topup-title">
    <h2 id="pdf-topup-title" className="text-xl font-bold">Top up PDF downloads</h2>
    <p className="mt-2">₹0.25 per PDF · Minimum top-up ₹100</p>
    <form onSubmit={checkout} className="mt-4">
      <label htmlFor="topup-amount" className="block text-sm font-semibold">Top-up amount (₹)</label>
      <input id="topup-amount" type="number" min="100" max="100000" step="0.25" value={amount} disabled={busy || Boolean(pending)} onChange={event => setAmount(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-indigo-200 bg-white px-3 sm:w-64" aria-describedby="topup-quote" required />
      <p id="topup-quote" aria-live="polite" className="mt-3 font-semibold">{quote ? `₹${(quote.amountPaise/100).toLocaleString('en-IN')} = ${quote.credits.toLocaleString('en-IN')} PDF downloads` : 'Enter ₹100–₹1,00,000 in multiples of ₹0.25.'}</p>
      <p className="mt-2 text-sm text-stone-600">One credit covers one PDF file, regardless of page count. Credits are added after payment confirmation. The amount shown is the total you pay; payment processing fees are absorbed by OrbitBoard.</p>
      <button type="submit" disabled={!quote || busy || Boolean(pending)} className="orbit-feedback-button mt-4 min-h-11 rounded-lg bg-violet-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Processing…' : 'Top up with Razorpay'}</button>
    </form>
    {pending && <button type="button" disabled={busy} onClick={() => verify(pending)} className="mt-3 min-h-11 text-indigo-700 underline">Retry payment confirmation</button>}
    {message && <p role="status" className="mt-3">{message}</p>}
  </section>;
}
