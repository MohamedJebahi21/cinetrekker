import assert from "node:assert/strict";

process.env.TMDB_API_KEY = "test-key";

const person = {
  name: "Jenna Ortega",
  biography: "Actor biography",
  profile_path: "/profile.jpg",
  known_for_department: "Acting",
  combined_credits: { cast: [] },
};

global.fetch = async () => ({
  ok: true,
  json: async () => person,
});

const { default: handler } = await import("../api/edge-meta.js");
const response = {
  headers: new Map(),
  statusCode: 200,
  body: "",
  setHeader(key, value) {
    this.headers.set(key.toLowerCase(), value);
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  },
  writeHead(code, headers = {}) {
    this.statusCode = code;
    for (const [key, value] of Object.entries(headers)) {
      this.headers.set(key.toLowerCase(), value);
    }
  },
  end(body = "") {
    this.body = body;
    return this;
  },
};

await handler(
  { method: "GET", url: "/person/jenna-ortega-974169" },
  response,
);

assert.equal(response.statusCode, 200);
assert.equal(
  response.headers.get("cache-control"),
  "no-store, no-cache, must-revalidate, proxy-revalidate",
);
assert.match(response.body, /<title>Jenna Ortega \| CineTrekker<\/title>/);
assert.match(response.body, /<script defer src="\/boot-watchdog\.js"><\/script>/);
assert.match(response.body, /rel="modulepreload"/);
assert.match(response.body, /<div id="root">/);
assert.match(response.body, /type="module" crossorigin src="\/assets\/index-/);
assert.match(response.body, /<meta property="og:title" content="Jenna Ortega \| CineTrekker" \/>/);

console.log("edge metadata SPA shell regression passed");
