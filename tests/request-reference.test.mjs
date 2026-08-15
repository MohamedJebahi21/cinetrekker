import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createRequestReferenceError,
  getRequestReference,
  normalizeRequestReference,
} from "../src/lib/requestReference.ts";

test("accepts only safe request-reference identifiers", () => {
  assert.equal(normalizeRequestReference("ct_abc12345"), "ct_abc12345");
  assert.equal(normalizeRequestReference("support_case_2026"), "support_case_2026");
  assert.equal(normalizeRequestReference("short"), null);
  assert.equal(normalizeRequestReference("unsafe / value"), null);
  assert.equal(normalizeRequestReference("x".repeat(97)), null);
});

test("preserves a validated request reference on API errors without copying unsafe metadata", () => {
  const error = createRequestReferenceError("Content data is temporarily unavailable.", {
    requestId: "proxy_case_2026",
    status: 502,
  });

  assert.equal(error.message, "Content data is temporarily unavailable.");
  assert.equal(error.status, 502);
  assert.equal(getRequestReference(error), "proxy_case_2026");

  const unsafeError = createRequestReferenceError("Request failed", {
    requestId: "token=do-not-display",
  });
  assert.equal(getRequestReference(unsafeError), null);
});
