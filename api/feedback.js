const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 4000;

const requestStore = new Map();

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }

  return req.socket?.remoteAddress || 'unknown';
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const allowedOrigins = new Set([
    'https://cinetrekker.vercel.app',
    'https://www.cinetrekker.vercel.app',
  ]);

  const isPreview = /^https:\/\/cinetrekker-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
  const isLocal = process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:(5173|5174|8080|4173)$/.test(origin);

  return allowedOrigins.has(origin) || isPreview || isLocal;
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = requestStore.get(key);

  if (!entry || now > entry.resetAt) {
    requestStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseBody(req) {
  if (!req || typeof req !== 'object') return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // CORS origin validation
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  const ip = getClientIP(req);
  const limitCheck = isRateLimited(`feedback:${ip}`);
  if (limitCheck.limited) {
    res.setHeader('Retry-After', String(limitCheck.retryAfter));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const body = parseBody(req);
  const name = normalizeText(body?.name, MAX_NAME_LENGTH);
  const email = normalizeText(body?.email, MAX_EMAIL_LENGTH);
  const message = normalizeText(body?.message, MAX_MESSAGE_LENGTH);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FEEDBACK_TO_EMAIL = process.env.FEEDBACK_TO_EMAIL;
  const FEEDBACK_FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || 'CineTrekker Feedback <onboarding@resend.dev>';

  if (!RESEND_API_KEY || !FEEDBACK_TO_EMAIL) {
    return res.status(503).json({
      error: 'Feedback service is temporarily unavailable.',
    });
  }

  const runtimeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
  if (!runtimeFetch) {
    return res.status(500).json({
      error: 'Feedback service is temporarily unavailable.',
    });
  }

  try {
    const response = await runtimeFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FEEDBACK_FROM_EMAIL,
        to: [FEEDBACK_TO_EMAIL],
        reply_to: email,
        subject: `New CineTrekker feedback from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      }),
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'Failed to send feedback. Please try again later.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('feedback function error', error);
    return res.status(500).json({
      error: 'Internal feedback service error.',
    });
  }
}
