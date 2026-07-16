#!/bin/bash
set -e

# Install all workspace dependencies
pnpm install

# Build shared libraries (lib/db, lib/api-zod, lib/api-client-react)
pnpm run typecheck:libs

# Push DB schema (idempotent — safe to re-run)
pnpm --filter @workspace/db run push
