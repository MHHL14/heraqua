// Shared helpers voor Vercel serverless functions.
// Auth, CORS, rate-limit, body-parsing, JSON-response.

const SHARED_TOKEN = process.env.HERQUA_SHARED_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

// Rate-limit: in-memory, per serverless instance. Cold starts reset.
// Voor productie met veel traffic: overweeg Upstash Redis.
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 3600 * 1000;
const RATE_LIMIT_MAX = 30;

export function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function checkAuth(req, res) {
  if (!SHARED_TOKEN) return true;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== SHARED_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

export function checkRate(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .toString().split(',')[0].trim();
  const now = Date.now();
  const window = rateLimits.get(ip) || [];
  const recent = window.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'rate_limited' });
    return false;
  }
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}

export async function readJsonBody(req) {
  // Vercel parseert JSON body automatisch als content-type application/json
  // Maar niet altijd — fallback via stream lezen.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export function requireApiKey(res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY niet geconfigureerd' });
    return null;
  }
  return key;
}
