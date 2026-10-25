/* eslint-env node */
export default async function handler(req, res) {
  // Simple same‑origin check (adjust as needed for your security model)
  const origin = req.headers.origin || '';
  if (origin && origin !== process.env.ORIGIN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const publicKey = process.env.RAZORPAY_PUBLIC_KEY || process.env.RAZORPAY_KEY_ID;
  if (!publicKey) {
    return res.status(500).json({ error: 'Razorpay public key not configured' });
  }

  res.status(200).json({ key: publicKey });
}
