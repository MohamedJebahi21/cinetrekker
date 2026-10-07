/**
 * Zero-dependency RFC 4180 compliant CSV parser and library import normalizer
 * Supports:
 * - Letterboxd exports (watched.csv, diary.csv, watchlist.csv, ratings.csv)
 * - Trakt CSV exports
 * - CineTrekker native JSON backups
 */

export interface ParsedImportItem {
  title: string;
  year?: number;
  mediaType: "movie" | "tv";
  targetList: "watched" | "watchlist";
  rating?: number; // 1-10 normalized
  watchedDate?: string; // YYYY-MM-DD
  note?: string;
  tmdbId?: number;
}

export interface ImportParseResult {
  source: "letterboxd_watched" | "letterboxd_watchlist" | "letterboxd_ratings" | "trakt" | "cinetrekker_json" | "unknown";
  items: ParsedImportItem[];
  errorCount: number;
}

/**
 * Parses raw CSV text into an array of string record arrays
 */
export function parseCSV(csvText: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRecord.push(currentField.trim());
        currentField = "";
      } else if (char === "\n") {
        currentRecord.push(currentField.trim());
        if (currentRecord.some((field) => field.length > 0)) {
          records.push(currentRecord);
        }
        currentRecord = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some((field) => field.length > 0)) {
      records.push(currentRecord);
    }
  }

  return records;
}

/**
 * Normalizes Letterboxd rating (0.5 to 5 stars) to 1-10 scale
 */
export function normalizeRating(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const num = typeof raw === "string" ? parseFloat(raw) : raw;
  if (Number.isNaN(num) || num <= 0) return undefined;
  // If Letterboxd 0.5 - 5 scale, scale to 1-10 (e.g. 4.5 -> 9)
  if (num <= 5) {
    return Math.min(10, Math.round(num * 2));
  }
  // If already 1-10
  return Math.min(10, Math.max(1, Math.round(num)));
}

/**
 * Parses file content (CSV or JSON) and returns structured import items
 */
export function parseImportFile(fileContent: string, fileName = ""): ImportParseResult {
  const trimmed = fileContent.trim();

  // 1. Check if native CineTrekker JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const data = JSON.parse(trimmed);
      const items: ParsedImportItem[] = [];

      if (Array.isArray(data.watched)) {
        for (const item of data.watched) {
          items.push({
            title: item.title || item.name || `Title ${item.media_id}`,
            mediaType: item.media_type === "tv" ? "tv" : "movie",
            targetList: "watched",
            rating: item.rating ? normalizeRating(item.rating) : undefined,
            note: item.note || undefined,
            tmdbId: item.media_id || item.tmdb_id,
            watchedDate: item.watched_at?.split("T")[0],
          });
        }
      }

      if (Array.isArray(data.watchlist)) {
        for (const item of data.watchlist) {
          items.push({
            title: item.title || item.name || `Title ${item.media_id}`,
            mediaType: item.media_type === "tv" ? "tv" : "movie",
            targetList: "watchlist",
            tmdbId: item.media_id || item.tmdb_id,
          });
        }
      }

      return {
        source: "cinetrekker_json",
        items,
        errorCount: 0,
      };
    } catch {
      // Fall through to CSV parser
    }
  }

  // 2. Parse as CSV
  const rows = parseCSV(trimmed);
  if (rows.length < 2) {
    return { source: "unknown", items: [], errorCount: 0 };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase());
  const headerMap = new Map<string, number>();
  headerRow.forEach((col, idx) => headerMap.set(col, idx));

  // Detect format
  const isLetterboxd = headerMap.has("name") && (headerMap.has("letterboxd uri") || headerMap.has("year"));
  const isTrakt = headerMap.has("trakt url") || (headerMap.has("type") && headerMap.has("title"));

  const items: ParsedImportItem[] = [];
  let errorCount = 0;

  if (isLetterboxd) {
    const isWatchlist = fileName.toLowerCase().includes("watchlist") || !headerMap.has("rating");
    const isRatings = fileName.toLowerCase().includes("ratings");
    const nameIdx = headerMap.get("name") ?? -1;
    const yearIdx = headerMap.get("year") ?? -1;
    const ratingIdx = headerMap.get("rating") ?? -1;
    const dateIdx = headerMap.get("watched date") ?? headerMap.get("date") ?? -1;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const title = nameIdx >= 0 ? row[nameIdx] : "";
      if (!title) {
        errorCount++;
        continue;
      }

      const yearStr = yearIdx >= 0 ? row[yearIdx] : "";
      const year = yearStr && /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : undefined;
      const rawRating = ratingIdx >= 0 ? row[ratingIdx] : undefined;
      const rating = normalizeRating(rawRating);
      const watchedDate = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : undefined;

      items.push({
        title,
        year,
        mediaType: "movie", // Letterboxd is movie-focused
        targetList: isWatchlist ? "watchlist" : "watched",
        rating,
        watchedDate,
      });
    }

    return {
      source: isWatchlist ? "letterboxd_watchlist" : isRatings ? "letterboxd_ratings" : "letterboxd_watched",
      items,
      errorCount,
    };
  }

  if (isTrakt) {
    const titleIdx = headerMap.get("title") ?? headerMap.get("name") ?? -1;
    const yearIdx = headerMap.get("year") ?? -1;
    const typeIdx = headerMap.get("type") ?? -1;
    const ratingIdx = headerMap.get("rating") ?? -1;
    const watchedAtIdx = headerMap.get("watched at") ?? headerMap.get("date") ?? -1;
    const isWatchlist = fileName.toLowerCase().includes("watchlist");

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const title = titleIdx >= 0 ? row[titleIdx] : "";
      if (!title) {
        errorCount++;
        continue;
      }

      const yearStr = yearIdx >= 0 ? row[yearIdx] : "";
      const year = yearStr && /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : undefined;
      const typeStr = typeIdx >= 0 ? row[typeIdx]?.toLowerCase() : "";
      const mediaType: "movie" | "tv" = typeStr.includes("show") || typeStr.includes("episode") || typeStr === "tv" ? "tv" : "movie";
      const rawRating = ratingIdx >= 0 ? row[ratingIdx] : undefined;
      const rating = normalizeRating(rawRating);
      const watchedDate = watchedAtIdx >= 0 && row[watchedAtIdx] ? row[watchedAtIdx]?.split("T")[0] : undefined;

      items.push({
        title,
        year,
        mediaType,
        targetList: isWatchlist ? "watchlist" : "watched",
        rating,
        watchedDate,
      });
    }

    return {
      source: "trakt",
      items,
      errorCount,
    };
  }

  // Generic fallback: check for title/name and optional year/rating
  const genericTitleIdx = headerMap.get("title") ?? headerMap.get("name") ?? 0;
  const genericYearIdx = headerMap.get("year") ?? -1;
  const genericRatingIdx = headerMap.get("rating") ?? -1;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = row[genericTitleIdx];
    if (!title) {
      errorCount++;
      continue;
    }
    const yearStr = genericYearIdx >= 0 ? row[genericYearIdx] : "";
    const year = yearStr && /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : undefined;
    const rating = genericRatingIdx >= 0 ? normalizeRating(row[genericRatingIdx]) : undefined;

    items.push({
      title,
      year,
      mediaType: "movie",
      targetList: "watched",
      rating,
    });
  }

  return {
    source: "unknown",
    items,
    errorCount,
  };
}
