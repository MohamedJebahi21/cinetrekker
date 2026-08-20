import handler from "../api/home-hero.js";

const response = {
  headers: new Map(),
  statusCode: null,
  body: "",
  setHeader(name, value) { this.headers.set(name.toLowerCase(), value); },
  status(code) { this.statusCode = code; return this; },
  send(body) { this.body = body || ""; return this; },
  end() { return this; },
};

await handler({ method: "GET" }, response);
const result = {
  statusCode: response.statusCode,
  contentType: response.headers.get("content-type") || null,
  hasSpaEntry: /<script[^>]+src="\/assets\//.test(response.body),
  hasHeroPreload: /<link rel="preload" as="image" href="https:\/\/image\.tmdb\.org\/t\/p\/w1280\//.test(response.body),
};

if (result.statusCode !== 200 || !result.hasSpaEntry) {
  throw new Error(`Unexpected Home preload handler result: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify(result, null, 2));
