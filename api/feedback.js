import { enforceRequestSecurity } from './_lib/requestSecurity.js';

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 4000;

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
  const securityCheck = await enforceRequestSecurity(req, res, 'feedback');
  if (!securityCheck.ok) {
    if (securityCheck.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(securityCheck.status).json({ error: securityCheck.error });
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
