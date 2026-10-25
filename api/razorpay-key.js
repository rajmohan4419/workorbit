/* global process */
import { getCorsHeaders } from './_lib/common.js';

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers?.origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, corsHeaders);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const publicKey = globalThis.process?.env?.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_PUBLIC_KEY || process.env.RAZORPAY_KEY_ID;
  if (!publicKey) {
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: 'Razorpay public key not configured' }));
    return;
  }

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ key: publicKey }));
}
