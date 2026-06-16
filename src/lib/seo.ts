import { absoluteSiteUrl } from "@/lib/siteUrl";
import { createSafeTextContent, sanitizeURL } from "@/lib/sanitize";
import type { Media } from "@/types/media";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export function slugifySegment(value: string): string {
  return createSafeTextContent(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Parse a URL segment like /movie/interstellar-157336 or /movie/157336/interstellar
 * Returns { id, slug } or null if no valid id is found.
 */
export function parseMediaPath(
  mediaType: "movie" | "tv" | "person",
  pathSegment: string,
): { id: number; slug?: string } | null {
  // format: /movie/{slug}-{id}  (new SEO-friendly format)
  const newFormat = pathSegment.match(/^(.+)-(\d{1,10})$/);
  if (newFormat) {
    const id = parseInt(newFormat[2], 10);
    if (Number.isFinite(id) && id > 0) {
      return { id, slug: newFormat[1] };
    }
  }

  // format: /movie/{id}/{slug?}  (legacy format)
  const parts = pathSegment.split("/").filter(Boolean);
  const firstPart = parts[0];
  if (firstPart) {
    const id = parseInt(firstPart, 10);
    if (Number.isFinite(id) && id > 0) {
      return { id, slug: parts[1] || undefined };
    }
  }

  return null;
}

export function buildCanonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return absoluteSiteUrl(normalized === "/" ? "/" : normalized.replace(/\/+$/, ""));
}

/**
 * Build a media path with SEO-friendly slug-first format.
 * Before: /movie/{id}/{slug}
 * After:  /movie/{slug}-{id}
 */
export function buildMediaPath(
  mediaType: "movie" | "tv",
  id: number | string,
  title?: string,
): string {
  const slug = title ? slugifySegment(title) : "";
  if (slug) {
    return `/${mediaType}/${slug}-${id}`;
  }
  return `/${mediaType}/${id}`;
}

/**
 * Build a person path with SEO-friendly slug-first format.
 * Before: /person/{id}/{slug}
 * After:  /person/{slug}-{id}
 */
export function buildPersonPath(id: number | string, name?: string): string {
  const slug = name ? slugifySegment(name) : "";
  if (slug) {
    return `/person/${slug}-${id}`;
  }
  return `/person/${id}`;
}

export function getMediaAltText(
  title: string,
  mediaType: "movie" | "tv",
  variant: "poster" | "backdrop" | "still" | "logo" = "poster",
): string {
  const typeLabel = mediaType === "movie" ? "movie" : "TV series";
  const safeTitle = createSafeTextContent(title) || "Untitled";
  switch (variant) {
    case "backdrop":
      return `Backdrop of ${safeTitle} (${typeLabel})`;
    case "still":
      return `${safeTitle} ${typeLabel} still image for movie tracker`;
    case "logo":
      return `${safeTitle} ${typeLabel} logo`;
    case "poster":
    default:
      return `Poster of ${safeTitle} (${typeLabel})`;
  }
}

export function sanitizeMetaText(value: string, maxLength = 320): string {
  return createSafeTextContent(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeJsonLd<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, fieldValue) => {
      if (typeof fieldValue === "string") {
        return sanitizeMetaText(fieldValue, 5_000);
      }
      return fieldValue;
    }),
  ) as T;
}

export function toFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: sanitizeMetaText(item.question, 180),
      acceptedAnswer: {
        "@type": "Answer",
        text: sanitizeMetaText(item.answer, 800),
      },
    })),
  };
}

export function toBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: sanitizeMetaText(item.name, 120),
      item: buildCanonicalUrl(item.path),
    })),
  };
}

export function toWebsiteSearchJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteSiteUrl("/")}#website`,
    url: absoluteSiteUrl("/"),
    name: "CineTrekker",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteSiteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function getMediaDescription(media: Partial<Media> & { title?: string; name?: string }) {
  return sanitizeMetaText(
    media.overview ||
      `${media.title || media.name || "This title"} is available to explore in CineTrekker, your movie tracker for discovery, watchlists, and updates.`,
    320,
  );
}

export function sanitizeExternalImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const safe = sanitizeURL(value);
  return safe || undefined;
}