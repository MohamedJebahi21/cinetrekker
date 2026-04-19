export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

export class ApiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

export async function requestJson<T>(
  input: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, timeoutMs = 12_000, headers, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const hasBody = body !== undefined;

  const requestHeaders: HeadersInit = {
    ...(headers ?? {}),
  };
  if (hasBody) {
    requestHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(input, {
      ...rest,
      signal: controller.signal,
      headers: requestHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

    const data = await response
      .json()
      .catch(() => ({} as Record<string, unknown>));

    if (!response.ok) {
      const message =
        (typeof data === "object" && data && "error" in data &&
          typeof (data as { error?: unknown }).error === "string" &&
          (data as { error: string }).error) ||
        `Request failed with status ${response.status}`;
      throw new ApiRequestError(message, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiRequestError("Request timed out", 408);
    }

    throw new ApiRequestError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}
