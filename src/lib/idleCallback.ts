type IdleCallbackOptions = {
  timeout?: number;
};

export function scheduleIdleTask(
  callback: () => void,
  options: IdleCallbackOptions = {},
): { cancel: () => void } {
  if (typeof window === "undefined") {
    return { cancel: () => undefined };
  }

  const idleWindow = window as Window &
    typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleCallbackOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const id = idleWindow.requestIdleCallback(callback, options);
    return {
      cancel: () => {
        idleWindow.cancelIdleCallback?.(id);
      },
    };
  }

  const frameId = idleWindow.requestAnimationFrame(callback);
  return {
    cancel: () => idleWindow.cancelAnimationFrame(frameId),
  };
}
