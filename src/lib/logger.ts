const IS_DEV = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (IS_DEV) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (IS_DEV) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (IS_DEV) console.error(...args);
  },
};
