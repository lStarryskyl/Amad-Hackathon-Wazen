---
name: lib/db composite build
description: How to regenerate TypeScript declarations after schema changes in lib/db so downstream packages (api-server) can typecheck.
---

# lib/db Composite TypeScript Build

## The rule
After modifying any file under `lib/db/src/` (e.g., adding a column to a schema table), run:

```
cd lib/db && npx tsc -p tsconfig.json
```

This regenerates the `.d.ts` declaration files in `lib/db/dist/`. Without this step, the `api-server` typecheck will fail with "Property X does not exist on type" errors referencing the OLD schema shape.

**Why:** `lib/db/tsconfig.json` uses `composite: true` + `emitDeclarationOnly: true` + `outDir: dist`. The api-server references the compiled declarations in `dist/`, not the TypeScript source. `lib/db` has no `build` or `typecheck` npm script — tsc must be run directly.

**How to apply:** Any time a Drizzle schema file is changed (add column, rename, add table), rebuild lib/db declarations BEFORE running `pnpm --filter @workspace/api-server run typecheck`.
