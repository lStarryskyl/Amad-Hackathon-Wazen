#!/usr/bin/env node
/**
 * Post-install patch: adds the missing `loadClerkUiScript` export to
 * @clerk/shared@3.47.8 so @clerk/react@5.54.0 can initialise without
 * crashing in React Native / Expo Go.
 *
 * Run automatically via the root package.json "postinstall" script.
 * Safe to run multiple times (idempotent).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PATCH = `
// ── Replit patch ─────────────────────────────────────────────────────────────
// @clerk/react@5.54.0 calls loadClerkUiScript() but @clerk/shared@3.47.8
// doesn't export it yet. Provide a no-op that satisfies the post-await check
// on global.__unstable_ClerkUiCtor so Clerk's isLoaded state resolves.
exports.loadClerkUiScript = async function loadClerkUiScript() {
  if (typeof global !== "undefined" && !global.__unstable_ClerkUiCtor) {
    global.__unstable_ClerkUiCtor = function NoopClerkUI() {};
  }
};
// ─────────────────────────────────────────────────────────────────────────────
`;

function findTargetFiles() {
  try {
    const result = execSync(
      'find node_modules/.pnpm/@clerk+shared@3.47.8* -name "loadClerkJsScript.js" -path "*/dist/runtime/*"',
      { encoding: "utf8" }
    ).trim();
    return result ? result.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

const targets = findTargetFiles();
if (targets.length === 0) {
  console.log("[patch-clerk-shared] No matching files found — skipping.");
  process.exit(0);
}

for (const target of targets) {
  const content = fs.readFileSync(target, "utf8");
  if (content.includes("loadClerkUiScript")) {
    console.log(`[patch-clerk-shared] Already patched: ${target}`);
    continue;
  }
  fs.writeFileSync(target, content + PATCH, "utf8");
  console.log(`[patch-clerk-shared] Patched: ${target}`);
}
