export async function fetchWithTimeout(
  input,
  options = {},
  timeoutMs = 8_000,
) {
  const controller = new AbortController();
  const parentSignal = options.signal;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => {
    controller.abort(parentSignal?.reason);
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

export function isTimeoutError(error) {
  return error instanceof Error && error.name === "AbortError";
}
