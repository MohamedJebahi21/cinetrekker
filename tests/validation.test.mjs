import test from "node:test";
import assert from "node:assert/strict";
import { validateReview, sanitizeBio } from "../src/lib/validation.ts";

test("validateReview accepts valid review payloads and trims comments", () => {
  const result = validateReview({
    rating: 9,
    comment: "  Great pacing and cinematography.  ",
    spoilerWarning: true,
  });

  assert.deepEqual(result, {
    rating: 9,
    comment: "Great pacing and cinematography.",
    spoilerWarning: true,
  });
});

test("validateReview throws Zod issue message on invalid input without TypeError", () => {
  assert.throws(
    () => validateReview({ rating: 11, comment: "Too high" }),
    /Rating must be at most 10/,
  );

  assert.throws(
    () => validateReview({ rating: 7, comment: "<script>alert(1)</script>" }),
    /Review cannot contain HTML tags/,
  );
});

test("sanitizeBio strips HTML tags on invalid bio input", () => {
  assert.equal(sanitizeBio("Hello <b>world</b>"), "Hello bworld/b");
});
