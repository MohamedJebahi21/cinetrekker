const fetch = globalThis.fetch;

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ip = getClientIP(req);
  const limitCheck = isRateLimited(`feedback:${ip}`);
  if (limitCheck.limited) {
    res.setHeader('Retry-After', String(limitCheck.retryAfter));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const name = normalizeText(req.body?.name, MAX_NAME_LENGTH);
  const email = normalizeText(req.body?.email, MAX_EMAIL_LENGTH);
  const message = normalizeText(req.body?.message, MAX_MESSAGE_LENGTH);

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
    return res.status(503).json({ error: 'Feedback service is not configured.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
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
      const detail = await response.text().catch(() => '');
      return res.status(502).json({ error: 'Failed to send feedback.', detail });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('feedback function error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
