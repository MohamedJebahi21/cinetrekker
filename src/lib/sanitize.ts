/**
 * Content Sanitization Utilities
 *
 * Defense-in-depth XSS protection using DOMPurify.
 * React auto-escapes string content, but this adds an extra layer for:
 * - User-generated content
 * - Third-party API responses that might contain HTML
 * - Defense-in-depth principle
 *
 * Usage:
 * ```typescript
 * import { sanitizeHTML, stripHTML } from '@/lib/sanitize';
 *
 * // Allow limited HTML tags (b, i, em, strong, u, p, br)
 * const safeContent = sanitizeHTML(userBio);
 *
 * // Strip all HTML tags (for text-only fields)
 * const plainText = stripHTML(movieDescription);
 * ```
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes content to allow safe HTML tags while preventing XSS
 * @param dirty - Untrusted HTML content
 * @param allowedTags - Array of allowed HTML tags (default: basic formatting)
 * @returns Sanitized HTML string safe to render
 */
export function sanitizeHTML(
  dirty: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'u', 'p', 'br']
): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [],
    FORCE_BODY: false,
    RETURN_DOM: false,
  }) as string;
}

/**
 * Strips all HTML tags, returning plain text only
 * Useful for fields that should never contain HTML (bios, descriptions, etc.)
 * @param dirty - Potentially HTML-containing text
 * @returns Plain text with all tags removed
 */
export function stripHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    FORCE_BODY: false,
    RETURN_DOM: false,
  }) as string;
}

/**
 * Sanitizes URLs to prevent javascript: and data: URIs
 * @param url - Untrusted URL
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';

  const urlLower = url.toLowerCase().trim();

  // Reject dangerous protocols
  if (
    urlLower.startsWith('javascript:') ||
    urlLower.startsWith('data:') ||
    urlLower.startsWith('vbscript:')
  ) {
    return '';
  }

  // Ensure http/https or relative paths
  if (
    !urlLower.startsWith('http://') &&
    !urlLower.startsWith('https://') &&
    !urlLower.startsWith('/')
  ) {
    return '';
  }

  return url;
}

/**
 * Sanitizes email addresses
 * Removes potentially malicious content while preserving valid email format
 * @param email - Untrusted email
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.toLowerCase().trim();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitizes user display names (no HTML, no special characters)
 * @param name - Untrusted display name
 * @param maxLength - Maximum length (default: 100)
 * @returns Sanitized name with HTML stripped
 */
export function sanitizeDisplayName(name: string, maxLength = 100): string {
  const stripped = stripHTML(name);
  return stripped.slice(0, maxLength).trim();
}

/**
 * Sanitizes search queries to prevent injection attacks
 * @param query - User search input
 * @param maxLength - Maximum length (default: 200)
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string, maxLength = 200): string {
  const trimmed = query.trim();

  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }

  // Remove potentially dangerous characters from search
  return trimmed
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Creates a safe text node with no HTML rendering
 * Use this when you need to ensure content is never parsed as HTML
 * @param text - Text content
 * @returns Sanitized plain text
 */
export function createSafeTextContent(text: string): string {
  // Strip all HTML tags completely
  return stripHTML(text);
}

/**
 * Validates and sanitizes JSON data from untrusted sources
 * @param jsonString - Potentially malicious JSON string
 * @returns Parsed and sanitized object or null if invalid
 */
export function sanitizeJSON(jsonString: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(jsonString);

    // Recursively sanitize string values in the object
    return sanitizeObjectStrings(parsed);
  } catch {
    return null;
  }
}

/**
 * Recursively sanitizes all string values in an object
 * @param obj - Object to sanitize
 * @returns Object with sanitized string values
 */
function sanitizeObjectStrings(
  obj: unknown
): Record<string, unknown> | unknown[] | string | number | boolean | null {
  if (typeof obj === 'string') {
    return stripHTML(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }

  return obj;
}
