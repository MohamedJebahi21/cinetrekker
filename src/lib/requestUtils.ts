/**
 * Request cancellation utility for managing in-flight API calls
 */
export class RequestCanceller {
  private abortControllers = new Map<string, AbortController>();

  /**
   * Get or create an abort controller for a request
   */
  getAbortController(key: string): AbortController {
    if (this.abortControllers.has(key)) {
      // Cancel existing request
      this.abortControllers.get(key)?.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(key, controller);
    return controller;
  }

  /**
   * Cancel specific request
   */
  cancel(key: string) {
    this.abortControllers.get(key)?.abort();
    this.abortControllers.delete(key);
  }

  /**
   * Cancel all requests
   */
  cancelAll() {
    for (const [, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}

import { useState, useEffect } from 'react';

/**
 * Debounce hook for search queries
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds (default 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Create a debounced callback function
 */
export function createDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

/**
 * Request throttler to limit API calls
 */
export class RequestThrottler {
  private lastCallTime = new Map<string, number>();
  private minInterval: number;

  constructor(minInterval: number = 1000) {
    this.minInterval = minInterval;
  }

  /**
   * Check if enough time has passed since last call
   */
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const lastTime = this.lastCallTime.get(key) || 0;
    return now - lastTime >= this.minInterval;
  }

  /**
   * Record that a request was made
   */
  recordRequest(key: string) {
    this.lastCallTime.set(key, Date.now());
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest(key: string): number {
    const lastTime = this.lastCallTime.get(key) || 0;
    const elapsed = Date.now() - lastTime;
    return Math.max(0, this.minInterval - elapsed);
  }

  /**
   * Reset throttle for a key
   */
  reset(key: string) {
    this.lastCallTime.delete(key);
  }
}
