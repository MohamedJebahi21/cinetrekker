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

export function buildCanonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return absoluteSiteUrl(normalized === "/" ? "/" : normalized.replace(/\/+$/, ""));
}

export function buildMediaPath(
  mediaType: "movie" | "tv",
  id: number | string,
  title?: string,
): string {
  const slug = title ? slugifySegment(title) : "";
  return slug ? `/${mediaType}/${id}/${slug}` : `/${mediaType}/${id}`;
}

export function buildPersonPath(id: number | string, name?: string): string {
  const slug = name ? slugifySegment(name) : "";
  return slug ? `/person/${id}/${slug}` : `/person/${id}`;
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
    "@id": `${absoluteSiteUrl("/") }#website`,
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
