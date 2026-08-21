const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY = "74eaa41ff1bf44c080731e3214963b72";
const siteOrigin = (process.env.INDEXNOW_SITE_ORIGIN || "https://cinetrekker.vercel.app").replace(/\/$/, "");

const changedPaths = [
  "/",
  "/movie-tracker",
  "/discover",
  "/search",
  "/calendar",
  "/sitemap.xml",
];

const siteUrl = new URL(siteOrigin);
const keyLocation = new URL(`/${INDEXNOW_KEY}.txt`, siteUrl).toString();
const urlList = changedPaths.map((path) => new URL(path, siteUrl).toString());

async function verifyOwnershipFile() {
  const response = await fetch(keyLocation, {
    headers: { Accept: "text/plain" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`IndexNow verification file is unavailable (HTTP ${response.status}).`);
  }

  const body = (await response.text()).trim();
  if (body !== INDEXNOW_KEY) {
    throw new Error("IndexNow verification file content does not match the configured key.");
  }
}

async function submitUrls() {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: siteUrl.hostname,
      key: INDEXNOW_KEY,
      keyLocation,
      urlList,
    }),
  });

  if (![200, 202].includes(response.status)) {
    const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 240);
    throw new Error(`IndexNow did not accept the notification (HTTP ${response.status}${detail ? `: ${detail}` : ""}).`);
  }

  return response.status;
}

try {
  await verifyOwnershipFile();
  const status = await submitUrls();
  console.log(`IndexNow accepted ${urlList.length} curated CineTrekker URLs (HTTP ${status}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "IndexNow notification failed.");
  process.exitCode = 1;
}
