const IS_DEV = import.meta.env.DEV;

function withScope(scope: string | undefined, args: unknown[]) {
  return scope ? [`[${scope}]`, ...args] : args;
}

export function createLogger(scope?: string) {
  return {
    debug: (...args: unknown[]) => {
      if (IS_DEV) console.debug(...withScope(scope, args));
    },
    info: (...args: unknown[]) => {
      if (IS_DEV) console.info(...withScope(scope, args));
    },
    warn: (...args: unknown[]) => {
      console.warn(...withScope(scope, args));
    },
    error: (...args: unknown[]) => {
      console.error(...withScope(scope, args));
    },
  };
}

export const logger = createLogger();
