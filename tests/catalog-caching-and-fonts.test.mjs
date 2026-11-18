import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

test("index.html preconnects and loads required typography fonts", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");

  assert.match(html, /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(html, /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"\s+crossorigin/);
  assert.match(html, /family=Bebas\+Neue/);
  assert.match(html, /family=DM\+Sans/);
  assert.match(html, /family=Inter/);
  assert.match(html, /family=Noto\+Sans\+Arabic/);
  assert.match(html, /family=Space\+Grotesk/);
});

test("CSP permits Google fonts in style-src and fonts.gstatic.com in font-src across configurations", () => {
  const vercelJson = JSON.parse(fs.readFileSync(path.join(rootDir, "vercel.json"), "utf-8"));
  const cspHeader = vercelJson.headers[0].headers.find((h) => h.key === "Content-Security-Policy")?.value;

  assert.ok(cspHeader, "CSP header must be present in vercel.json");
  assert.match(cspHeader, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(cspHeader, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);

  const headersFile = fs.readFileSync(path.join(rootDir, "_headers"), "utf-8");
  assert.match(headersFile, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(headersFile, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);

  const viteConfig = fs.readFileSync(path.join(rootDir, "vite.config.ts"), "utf-8");
  assert.match(viteConfig, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(viteConfig, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
});

test("vercel.json configures edge caching for catalog and sitemap while protecting dynamic APIs", () => {
  const vercelJson = JSON.parse(fs.readFileSync(path.join(rootDir, "vercel.json"), "utf-8"));

  // Check header rules
  const catalogHeader = vercelJson.headers.find((h) => h.source === "/(movie|tv|person)/:path*");
  assert.ok(catalogHeader, "Catalog route header rule must exist");
  const catalogCache = catalogHeader.headers.find((h) => h.key === "Cache-Control")?.value;
  assert.match(catalogCache, /s-maxage=86400/);
  assert.match(catalogCache, /stale-while-revalidate=604800/);

  const movieTrackerHeader = vercelJson.headers.find((h) => h.source === "/movie-tracker");
  assert.ok(movieTrackerHeader, "Movie tracker route header rule must exist");
  const movieTrackerCache = movieTrackerHeader.headers.find((h) => h.key === "Cache-Control")?.value;
  assert.match(movieTrackerCache, /s-maxage=86400/);

  const sitemapHeader = vercelJson.headers.find((h) => h.source === "/sitemap.xml");
  assert.ok(sitemapHeader, "Sitemap route header rule must exist");
  const sitemapCache = sitemapHeader.headers.find((h) => h.key === "Cache-Control")?.value;
  assert.match(sitemapCache, /s-maxage=3600/);

  // Private/dynamic APIs stay no-store
  const privateApiHeader = vercelJson.headers.find((h) => h.source === "/api/(?!tmdb-proxy|enrichment|sitemap)(.*)");
  assert.ok(privateApiHeader, "Private API rule must explicitly exclude cacheable proxies");
  const privateApiCache = privateApiHeader.headers.find((h) => h.key === "Cache-Control")?.value;
  assert.match(privateApiCache, /no-store/);
});
