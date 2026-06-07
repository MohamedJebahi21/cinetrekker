import { enforceRequestSecurity } from './_lib/requestSecurity.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // CORS origin validation and rate limit
  const securityCheck = await enforceRequestSecurity(req, res, 'feedback');
  if (!securityCheck.ok) {
    if (securityCheck.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(securityCheck.status).json({ error: securityCheck.error });
  }

  try {
    const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    const answer = num1 + num2;
    const challenge = `Please solve: ${num1} + ${num2} = ?`;

    const SIGNING_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TMDB_API_KEY || 'fallback_salt_cinetrekker';
    const expiresAt = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes

    const payload = {
      answer: answer.toString(),
      expiresAt,
    };

    const serialized = JSON.stringify(payload);
    const base64Payload = Buffer.from(serialized).toString('base64');
    const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(serialized).digest('hex');

    const token = `math:${base64Payload}.${signature}`;

    return res.status(200).json({ challenge, token });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate captcha challenge.' });
  }
}
