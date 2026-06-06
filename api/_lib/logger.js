import { isServerProduction } from "./env.js";

function formatScope(scope) {
  return scope ? `[${scope}]` : "[server]";
}

function sanitizeLogArgs(args) {
  return args.map((arg) => {
    if (arg instanceof Error) {
      if (typeof arg.stack === "string") {
        // Strip out local user directory names, workspace absolute paths, or hosting server path details
        let cleaned = arg.stack;
        
        // Remove workspace path prefix (matches typical Windows/Linux project structures)
        cleaned = cleaned.replace(/[a-zA-Z]:\\My Own Games\\[^\\]+\\cinetrekker\\/gi, "project/");
        cleaned = cleaned.replace(/[a-zA-Z]:\\[^\\]+\\[^\\]+\\.gemini\\/gi, "appdata/");
        cleaned = cleaned.replace(/\/var\/task\//gi, "project/"); // standard Vercel lambda container path
        cleaned = cleaned.replace(/\\/g, "/"); // normalize backslashes
        
        return `${arg.name}: ${arg.message}\nStack: ${cleaned}`;
      }
      return `${arg.name}: ${arg.message}`;
    }
    return arg;
  });
}

export function createServerLogger(scope) {
  const prefix = formatScope(scope);

  return {
    debug: (...args) => {
      if (!isServerProduction()) {
        console.debug(prefix, ...sanitizeLogArgs(args));
      }
    },
    info: (...args) => {
      console.info(prefix, ...sanitizeLogArgs(args));
    },
    warn: (...args) => {
      console.warn(prefix, ...sanitizeLogArgs(args));
    },
    error: (...args) => {
      console.error(prefix, ...sanitizeLogArgs(args));
    },
  };
}
