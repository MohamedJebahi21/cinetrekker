import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const protectedPublicFiles = [
  "public/apple-touch-icon.png",
  "public/favicon-16x16.png",
  "public/favicon-32x32.png",
  "public/favicon.ico",
  "public/og-image.png",
  "public/robots.txt",
];

function runGit(args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    if (error?.code === "ENOENT") {
      if (allowFailure) {
        return null;
      }
      throw new Error("git is not available to the workspace doctor.");
    }
    if (allowFailure) {
      return null;
    }
    throw error;
  }
}

function ensureHeadRef() {
  const headCommit = runGit(["rev-parse", "--verify", "HEAD"], true);
  if (headCommit) {
    return false;
  }

  const branchRef = runGit(["symbolic-ref", "-q", "HEAD"], true);
  const remoteMain = runGit(["rev-parse", "--verify", "origin/main"], true);

  if (!branchRef || !remoteMain) {
    throw new Error("Unable to repair git HEAD automatically.");
  }

  runGit(["update-ref", branchRef, remoteMain]);
  return true;
}

function restoreProtectedPublicFiles() {
  const missing = protectedPublicFiles.filter((file) => !existsSync(file));
  if (missing.length === 0) {
    return [];
  }

  runGit(["checkout", "--", ...missing]);
  return missing;
}

let repairedHead = false;
let restoredFiles = [];

try {
  repairedHead = ensureHeadRef();
  restoredFiles = restoreProtectedPublicFiles();
} catch (error) {
  console.warn(
    `Workspace doctor skipped git integrity checks: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

if (repairedHead) {
  console.log("Repaired local git branch reference from origin/main.");
}

if (restoredFiles.length > 0) {
  console.log(`Restored ${restoredFiles.length} missing protected public file(s).`);
  restoredFiles.forEach((file) => console.log(`- ${file}`));
}

if (!repairedHead && restoredFiles.length === 0) {
  console.log("Workspace integrity check passed.");
}
