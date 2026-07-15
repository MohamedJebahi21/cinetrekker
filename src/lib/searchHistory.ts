import { createLogger } from "@/lib/logger";

const SEARCH_HISTORY_ID = 'cinetrekker_search_history';
const MAX_HISTORY_ITEMS = 20;
const logger = createLogger("search-history");

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export function addToSearchHistory(query: string): void {
  if (!query.trim()) return;
  
  try {
    const history = getSearchHistory();
    
    // Clean up duplicates
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    
    // Add new search at the beginning
    const newHistory: SearchHistoryItem[] = [
      { query: query.trim(), timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_ID, JSON.stringify(newHistory));
  } catch (error) {
    logger.error('Failed to save search history', error);
  }
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_ID);
    if (!stored) return [];
    
    const history: SearchHistoryItem[] = JSON.parse(stored);
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error('Failed to load search history', error);
    return [];
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_ID);
  } catch (error) {
    logger.error('Failed to clear search history', error);
  }
}

export function removeFromSearchHistory(query: string): void {
  try {
    const history = getSearchHistory();
    const filtered = history.filter(item => item.query !== query);
    localStorage.setItem(SEARCH_HISTORY_ID, JSON.stringify(filtered));
  } catch (error) {
    logger.error('Failed to remove from search history', error);
  }
}

// Track trending searches globally (simplified version using localStorage)
const TRENDING_ID = 'cinetrekker_trending_searches';

export interface TrendingSearch {
  query: string;
  count: number;
}

export function trackTrendingSearch(query: string): void {
  if (!query.trim()) return;
  
  try {
    const trending = getTrendingSearches();
    const existing = trending.find(item => item.query.toLowerCase() === query.toLowerCase());
    
    if (existing) {
      existing.count += 1;
    } else {
      trending.push({ query: query.trim(), count: 1 });
    }
    
    // Sort by count and keep top 50
    const sorted = trending.sort((a, b) => b.count - a.count).slice(0, 50);
    localStorage.setItem(TRENDING_ID, JSON.stringify(sorted));
  } catch (error) {
    logger.error('Failed to track trending search', error);
  }
}

export function getTrendingSearches(): TrendingSearch[] {
  try {
    const stored = localStorage.getItem(TRENDING_ID);
    if (!stored) return [];
    
    const trending: TrendingSearch[] = JSON.parse(stored);
    return trending.sort((a, b) => b.count - a.count);
  } catch (error) {
    logger.error('Failed to load trending searches', error);
    return [];
  }
}
