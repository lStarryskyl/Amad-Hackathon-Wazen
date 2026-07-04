#!/usr/bin/env node
/**
 * Checks for name collisions between the Orval-generated API client and the
 * manually-written hooks in lib/api-client-react/src/index.ts.
 *
 * A "collision" is when the generated api.ts exports a symbol with the same
 * name as one of the explicitly re-exported manual symbols in index.ts. The
 * `export * from "./generated/api"` wildcard at the bottom of index.ts means
 * TypeScript silently drops the ambiguous wildcard export — the manual one
 * wins, but any type mismatch is invisible until runtime.
 *
 * Known intentional overrides are listed in ALLOWED_COLLISIONS below. These
 * are cases where the hand-written hook has richer types or different behavior
 * than the generated version, and the manual export is explicitly preferred.
 *
 * This script exits non-zero when *new* (un-allowed) collisions are found so
 * `pnpm codegen` fails early and the developer can decide whether the manual
 * export should be removed, updated, or added to ALLOWED_COLLISIONS.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..");
const generatedApiPath = resolve(
  root,
  "lib",
  "api-client-react",
  "src",
  "generated",
  "api.ts"
);
const indexPath = resolve(
  root,
  "lib",
  "api-client-react",
  "src",
  "index.ts"
);

// ---------------------------------------------------------------------------
// Known intentional overrides. These are names where the manually-written
// hook in intelligence.ts / simulations.ts / engagement.ts is intentionally
// preferred over the Orval-generated version because it has richer types or
// different behavior. Adding a name here silences the collision warning for
// that specific symbol.
//
// When you add a new entry, include a comment explaining why the manual
// version is preferred.
// ---------------------------------------------------------------------------
const ALLOWED_COLLISIONS = new Set([
  // intelligence.ts: richer return types (RegretScore includes history,
  // factors, and score details) compared to the bare generated version.
  "getRegretScore",
  "useGetRegretScore",
  // intelligence.ts: MoneyStory type includes structured narrative fields
  // not present in the generated schema type.
  "generateMoneyStory",
  "useGenerateMoneyStory",
]);

// ---------------------------------------------------------------------------
// Extract exported names from generated/api.ts.
// Matches top-level declarations like:
//   export const foo = ...
//   export function foo(...) ...
//   export type FooType = ...
//   export interface FooInterface { ... }
//   export enum FooEnum { ... }
//   export { foo, bar }
//   export { foo as bar }
// ---------------------------------------------------------------------------
function extractGeneratedExports(src) {
  const names = new Set();

  // Top-level keyword declarations
  for (const m of src.matchAll(
    /^export\s+(?:const|function|type|interface|enum|class|abstract\s+class)\s+(\w+)/gm
  )) {
    names.add(m[1]);
  }

  // Named re-export blocks: export { foo, bar as baz }
  for (const m of src.matchAll(/^export\s+\{([^}]+)\}/gm)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }

  return names;
}

// ---------------------------------------------------------------------------
// Extract *explicitly* named exports from index.ts (not export * lines),
// returning a Map<exportedName, sourceModule> so error messages can name the
// file where each manual export originates.
//
// We slice the file at the first line that begins with "export * from" — this
// marks the boundary between manual exports and generated exports. We use a
// line-anchored regex (^ with m flag) so we don't accidentally match text
// that appears inside a comment such as "// `export * from ...`".
//
// For each export block we extract the source path from the trailing
// `from "..."` clause to report which module the collision comes from.
//
// Matches the braces in:
//   export { foo, bar } from "./module"
//   export type { Foo, Bar } from "./module"
// ---------------------------------------------------------------------------
function extractManualExports(src) {
  /** @type {Map<string, string>} name -> short source module name */
  const nameToModule = new Map();

  const wildcardMatch = src.match(/^export \* from/m);
  const manualSection =
    wildcardMatch && wildcardMatch.index != null
      ? src.slice(0, wildcardMatch.index)
      : src;

  // Match an entire export block + its from clause on the same or adjacent lines.
  // The braces may span multiple lines, so we use [\s\S]*? for the inner content.
  for (const m of manualSection.matchAll(
    /export\s+(?:type\s*)?\{([^}]+)\}\s*from\s*["']([^"']+)["']/g
  )) {
    const rawNames = m[1];
    const fromPath = m[2]; // e.g. "./intelligence"
    const moduleName = fromPath.replace(/^.*\//, "") + ".ts"; // "intelligence.ts"

    for (const raw of rawNames.split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) nameToModule.set(name, moduleName);
    }
  }

  return nameToModule;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let generatedSrc, indexSrc;
try {
  generatedSrc = readFileSync(generatedApiPath, "utf8");
} catch {
  console.error(`[check-collisions] Could not read: ${generatedApiPath}`);
  process.exit(1);
}
try {
  indexSrc = readFileSync(indexPath, "utf8");
} catch {
  console.error(`[check-collisions] Could not read: ${indexPath}`);
  process.exit(1);
}

const generatedNames = extractGeneratedExports(generatedSrc);
const manualExports = extractManualExports(indexSrc);

const allCollisions = [...manualExports.keys()].filter((n) =>
  generatedNames.has(n)
);
const allowedFound = allCollisions.filter((n) => ALLOWED_COLLISIONS.has(n));
const unexpected = allCollisions.filter((n) => !ALLOWED_COLLISIONS.has(n));

if (allowedFound.length > 0) {
  console.log(
    `[check-collisions] ℹ ${allowedFound.length} known intentional override(s) (allowed): ${allowedFound.join(", ")}`
  );
}

if (unexpected.length === 0) {
  console.log("[check-collisions] ✓ No unexpected export name collisions detected.");
  process.exit(0);
}

console.error(
  `\n[check-collisions] ✗ ${unexpected.length} unexpected export name collision(s) detected:\n`
);
for (const name of unexpected) {
  const src = manualExports.get(name) ?? "index.ts";
  console.error(
    `  Collision detected: ${name} is exported by both ${src} and generated/api.ts`
  );
}
console.error(
  `\nThe explicit exports in index.ts will silently shadow the generated ones. ` +
    `For each collision, either:\n` +
    `  1. Remove the manual export from index.ts if the generated version is correct, or\n` +
    `  2. Rename the endpoint in openapi.yaml so the generated name no longer collides, or\n` +
    `  3. Add the name to ALLOWED_COLLISIONS in lib/api-spec/scripts/check-export-collisions.mjs\n` +
    `     with a comment explaining why the manual version is intentionally preferred.\n`
);
process.exit(1);
