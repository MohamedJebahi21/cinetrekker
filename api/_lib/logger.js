import { isServerProduction } from "./env.js";

function formatScope(scope) {
  return scope ? `[${scope}]` : "[server]";
}

export function createServerLogger(scope) {
  const prefix = formatScope(scope);

  return {
    debug: (...args) => {
      if (!isServerProduction()) {
        console.debug(prefix, ...args);
      }
    },
    info: (...args) => {
      console.info(prefix, ...args);
    },
    warn: (...args) => {
      console.warn(prefix, ...args);
    },
    error: (...args) => {
      console.error(prefix, ...args);
    },
  };
}
