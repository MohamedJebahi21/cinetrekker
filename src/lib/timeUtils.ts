import { formatDistanceToNow, isToday, isBefore, isAfter, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';

export interface ReleaseTimeInfo {
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
  label: string;
  relativeTime: string;
}

/**
 * Get detailed time information for a release date
 * Supports both date-only strings (YYYY-MM-DD) and ISO datetime strings
 */
export function getReleaseTimeInfo(dateString: string | null | undefined): ReleaseTimeInfo | null {
  if (!dateString) return null;
  
  const now = new Date();
  
  // Parse the date - handle both YYYY-MM-DD and ISO datetime formats
  let releaseDate: Date;
  try {
    if (dateString.includes('T')) {
      // Full ISO datetime
      releaseDate = parseISO(dateString);
    } else {
      // Date only - assume end of day (23:59) for episodes without specific time
      // This prevents showing episodes as "released" before the day is actually over
      releaseDate = new Date(dateString + 'T23:59:00');
    }
  } catch {
    return null;
  }
  
  if (isNaN(releaseDate.getTime())) return null;
  
  const isPast = isBefore(releaseDate, now);
  const isFuture = isAfter(releaseDate, now);
  const todayCheck = isToday(releaseDate);
  
  // Generate appropriate label
  let label = '';
  let relativeTime = '';
  
  if (todayCheck && isPast) {
    const hoursAgo = differenceInHours(now, releaseDate);
    const minutesAgo = differenceInMinutes(now, releaseDate);
    
    if (minutesAgo < 60) {
      label = 'just_released';
      relativeTime = minutesAgo <= 1 ? 'Just now' : `${minutesAgo}m ago`;
    } else if (hoursAgo < 6) {
      label = 'released_hours_ago';
      relativeTime = `${hoursAgo}h ago`;
    } else {
      label = 'today';
      relativeTime = 'Today';
    }
  } else if (todayCheck && isFuture) {
    const hoursUntil = differenceInHours(releaseDate, now);
    const minutesUntil = differenceInMinutes(releaseDate, now);
    
    if (minutesUntil < 60) {
      label = 'coming_soon';
      relativeTime = `In ${minutesUntil}m`;
    } else {
      label = 'today';
      relativeTime = `In ${hoursUntil}h`;
    }
  } else if (isPast) {
    label = 'past';
    relativeTime = formatDistanceToNow(releaseDate, { addSuffix: true });
  } else {
    label = 'upcoming';
    relativeTime = formatDistanceToNow(releaseDate, { addSuffix: true });
  }
  
  return {
    isPast,
    isFuture,
    isToday: todayCheck,
    label,
    relativeTime,
  };
}

/**
 * Format a datetime for display in cards
 */
export function formatReleaseDateTime(dateString: string | null | undefined, locale: string = 'en'): string {
  if (!dateString) return '';
  
  try {
    const date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString + 'T23:59:00');
    
    if (isNaN(date.getTime())) return '';
    
    // Format: "Jan 21" or "Jan 21, 8:00 PM" if time is included
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    
    if (dateString.includes('T')) {
      options.hour = 'numeric';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString(locale, options);
  } catch {
    return '';
  }
}

/**
 * Check if an episode has been released based on its air date/time
 */
export function hasBeenReleased(dateString: string | null | undefined): boolean {
  const info = getReleaseTimeInfo(dateString);
  return info ? info.isPast : false;
}

/**
 * Get a badge variant based on release time
 */
export function getReleaseBadgeVariant(info: ReleaseTimeInfo | null): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (!info) return 'outline';
  
  if (info.label === 'just_released') return 'default';
  if (info.label === 'released_hours_ago') return 'default';
  if (info.label === 'today' && info.isPast) return 'default';
  if (info.label === 'coming_soon') return 'secondary';
  if (info.isFuture) return 'outline';
  
  return 'secondary';
}
