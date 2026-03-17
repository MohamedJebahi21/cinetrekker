import { Media } from "@/types/media";

export enum SafetyLevel {
  STRICT = "strict",
  MODERATE = "moderate",
  NONE = "none",
}

export type MaturityRating = "strict" | "moderate" | "none";

type RatingLike = string | null | undefined;

export type SafetyMedia = Media & {
  rating?: RatingLike;
  certification?: RatingLike;
  ageRating?: RatingLike;
  contentRating?: RatingLike;
};

const STRICT_BLOCK_TAGS = new Set([
  "R",
  "15",
  "15A",
  "16",
  "17",
  "MA15+",
  "TVMA",
  "NC17",
  "18+",
  "ADULT",
  "EXPLICIT",
  "UNRATED",
  "NR",
]);
const MODERATE_BLOCK_TAGS = new Set(["NC17", "18+", "ADULT", "EXPLICIT"]);

const SAFETY_FILTER_CACHE = new WeakMap<
  readonly SafetyMedia[],
  Partial<Record<MaturityRating, readonly SafetyMedia[]>>
>();

export function maturityToFlags(level: MaturityRating): {
  strictFiltering: boolean;
  moderateFiltering: boolean;
} {
  return {
    strictFiltering: level === "strict",
    moderateFiltering: level === "strict" || level === "moderate",
  };
}

export function resolveMaturityRating(
  strictFiltering: boolean,
  moderateFiltering: boolean,
): MaturityRating {
  if (strictFiltering) return "strict";
  if (moderateFiltering) return "moderate";
  return "none";
}

function normalizeRating(value?: RatingLike): string {
  if (!value) return "";
  return value.toUpperCase().replace(/\s+/g, "").replace(/[_-]/g, "");
}

function getCandidateRatings(item: SafetyMedia): string[] {
  return [item.rating, item.certification, item.ageRating, item.contentRating]
    .map(normalizeRating)
    .filter(Boolean);
}

function isAdultFlagged(item: SafetyMedia): boolean {
  return item.adult === true;
}

function isStrictBlocked(item: SafetyMedia): boolean {
  if (isAdultFlagged(item)) return true;
  const ratings = getCandidateRatings(item);
  return ratings.some((rating) => STRICT_BLOCK_TAGS.has(rating));
}

function isModerateBlocked(item: SafetyMedia): boolean {
  if (isAdultFlagged(item)) return true;
  const ratings = getCandidateRatings(item);
  return ratings.some((rating) => MODERATE_BLOCK_TAGS.has(rating));
}

export function applySafetyFilter<T extends SafetyMedia>(
  mediaList: T[],
  level: MaturityRating,
): T[];
export function applySafetyFilter<T extends SafetyMedia>(
  mediaList: T[],
  strictMode: boolean,
  moderateMode: boolean,
): T[];
export function applySafetyFilter<T extends SafetyMedia>(
  mediaList: T[],
  levelOrStrict: MaturityRating | boolean,
  maybeModerate?: boolean,
): T[] {
  const maturityLevel =
    typeof levelOrStrict === "string"
      ? levelOrStrict
      : resolveMaturityRating(levelOrStrict, maybeModerate === true);

  const cachedForList = SAFETY_FILTER_CACHE.get(mediaList);
  const cached = cachedForList?.[maturityLevel] as T[] | undefined;
  if (cached) return cached;

  const filtered =
    maturityLevel === "none"
      ? mediaList
      : maturityLevel === "strict"
        ? mediaList.filter((item) => !isStrictBlocked(item))
        : mediaList.filter((item) => !isModerateBlocked(item));

  const nextCache = cachedForList ?? {};
  nextCache[maturityLevel] = filtered;
  SAFETY_FILTER_CACHE.set(mediaList, nextCache);

  return filtered;
}

export function isMediaAllowedBySafety(
  item: SafetyMedia,
  level: MaturityRating,
): boolean;
export function isMediaAllowedBySafety(
  item: SafetyMedia,
  strictMode: boolean,
  moderateMode: boolean,
): boolean;
export function isMediaAllowedBySafety(
  item: SafetyMedia,
  levelOrStrict: MaturityRating | boolean,
  maybeModerate?: boolean,
): boolean {
  const maturityLevel =
    typeof levelOrStrict === "string"
      ? levelOrStrict
      : resolveMaturityRating(levelOrStrict, maybeModerate === true);

  if (maturityLevel === "none") return true;
  if (maturityLevel === "strict") return !isStrictBlocked(item);
  return !isModerateBlocked(item);
}

// Backward-compatible helper for legacy imports.
export function filterMediaByAdultPolicy<T extends SafetyMedia>(
  mediaList: T[],
  adultEnabled: boolean,
): T[] {
  return applySafetyFilter(mediaList, adultEnabled ? "none" : "strict");
}

export function isAdultByRatingTag(rating?: string): boolean {
  const normalized = normalizeRating(rating);
  return (
    normalized === "R" ||
    normalized === "NC17" ||
    normalized === "18+" ||
    normalized === "ADULT"
  );
}
