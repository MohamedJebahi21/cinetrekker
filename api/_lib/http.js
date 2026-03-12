export function json(res, status, payload) {
  return res.status(status).json(payload);
}

export function parseBody(req) {
  if (!req || typeof req !== "object") return {};

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

export function getBearerToken(req) {
  const authHeader = req?.headers?.authorization;
  if (typeof authHeader !== "string") return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  return match[1]?.trim() || null;
}
