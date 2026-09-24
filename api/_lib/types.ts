import type { IncomingMessage, ServerResponse } from "node:http";

export interface ApiServerRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  url?: string;
}

export interface ApiServerResponse extends ServerResponse {
  status: (code: number) => ApiServerResponse;
  json: (data: unknown) => ApiServerResponse;
  send: (data: unknown) => ApiServerResponse;
}

export interface RequestSecurityResult {
  ok: boolean;
  status: number;
  error?: string;
}

export interface AuthenticatedUser {
  ok: boolean;
  userId?: string;
  status?: number;
  error?: string;
}
