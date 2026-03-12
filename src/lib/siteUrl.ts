const DEFAULT_SITE_URL = 'https://cinetrekker.vercel.app';

function normalizeSiteUrl(value?: string) {
  if (!value) return DEFAULT_SITE_URL;

  try {
    const normalized = new URL(value).origin;
    return normalized.replace(/\/$/, '');
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const siteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL);

export function absoluteSiteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}
