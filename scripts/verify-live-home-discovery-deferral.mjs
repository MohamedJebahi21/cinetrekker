import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const requestUrls = [];

page.on("request", (request) => {
  const url = request.url();
  if (url.includes("themoviedb.org/3/") || url.includes("/api/tmdb")) {
    requestUrls.push(url);
  }
});

try {
  const response = await page.goto("https://cinetrekker.vercel.app/", {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await page.waitForTimeout(2_500);

  const mediaRequests = requestUrls
    .map((url) => ({ url, decodedUrl: decodeURIComponent(url) }))
    .filter(({ decodedUrl }) =>
      /(?:trending\/all\/(?:day|week)|movie\/now_playing)/.test(decodedUrl),
    );
  const weeklyRequests = mediaRequests.filter(({ decodedUrl }) => decodedUrl.includes("trending/all/week"));
  const dailyRequests = mediaRequests.filter(({ decodedUrl }) => decodedUrl.includes("trending/all/day"));
  const newReleaseRequests = mediaRequests.filter(({ decodedUrl }) => decodedUrl.includes("movie/now_playing"));

  const result = {
    responseStatus: response?.status() ?? null,
    weeklyRequestCount: weeklyRequests.length,
    dailyRequestCount: dailyRequests.length,
    newReleaseRequestCount: newReleaseRequests.length,
    mediaRequests: mediaRequests.map(({ url }) => url),
    passed:
      response?.status() === 200 &&
      weeklyRequests.length >= 1 &&
      dailyRequests.length >= 1 &&
      newReleaseRequests.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
