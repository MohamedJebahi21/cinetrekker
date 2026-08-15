const REQUEST_REFERENCE_PATTERN = /^[a-zA-Z0-9_-]{8,96}$/;

export interface RequestReferenceError extends Error {
  requestId?: string;
  status?: number;
}

export function normalizeRequestReference(value: unknown): string | null {
  return typeof value === "string" && REQUEST_REFERENCE_PATTERN.test(value)
    ? value
    : null;
}

export function createRequestReferenceError(
  message: string,
  options: { requestId?: unknown; status?: number } = {},
): RequestReferenceError {
  const error = new Error(message) as RequestReferenceError;
  const requestId = normalizeRequestReference(options.requestId);

  if (requestId) error.requestId = requestId;
  if (typeof options.status === "number") error.status = options.status;

  return error;
}

export function getRequestReference(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  return normalizeRequestReference(
    (error as { requestId?: unknown }).requestId,
  );
}
