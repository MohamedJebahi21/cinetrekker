import fs from "node:fs";

const vercelConfig = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const headersFile = fs.readFileSync("_headers", "utf8");

const serialized = JSON.stringify(vercelConfig);
const requiredHeaderTokens = [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Strict-Transport-Security",
  "Referrer-Policy",
  "require-trusted-types-for 'script'",
];

const missingInVercel = requiredHeaderTokens.filter(
  (token) => !serialized.includes(token),
);

const missingInNetlifyHeaders = requiredHeaderTokens.filter(
  (token) => !headersFile.includes(token),
);

if (missingInVercel.length > 0 || missingInNetlifyHeaders.length > 0) {
  console.error("Security header verification failed.");
  if (missingInVercel.length > 0) {
    console.error("Missing in vercel.json:", missingInVercel.join(", "));
  }
  if (missingInNetlifyHeaders.length > 0) {
    console.error("Missing in _headers:", missingInNetlifyHeaders.join(", "));
  }
  process.exit(1);
}

console.log("Security headers and CSP configuration verified.");
