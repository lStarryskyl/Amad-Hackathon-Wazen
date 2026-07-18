# Builds and runs @workspace/api-server out of the pnpm monorepo.
# Build context must be the REPO ROOT (Railway root directory left as ".",
# with this Dockerfile referenced via its path) so pnpm workspace linking
# and the shared lib/* packages resolve correctly.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

# Install deps for the whole workspace first (better layer caching).
# All workspace package.json files must be present so pnpm's lockfile check
# and workspace graph resolve correctly, even though we only build api-server.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY scripts scripts
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/wazen-landing/package.json artifacts/wazen-landing/package.json
COPY artifacts/finance-mobile/package.json artifacts/finance-mobile/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json

# pnpm exits non-zero here purely because the filtered/scoped install skips
# re-confirming the workspace's onlyBuiltDependencies allowlist (esbuild) even
# though the package itself installs and links correctly. Swallow it.
RUN pnpm install --frozen-lockfile --filter @workspace/api-server... --filter @workspace/db --filter @workspace/api-zod || true

# Now copy full source and build.
COPY lib/db lib/db
COPY lib/api-zod lib/api-zod
COPY artifacts/api-server artifacts/api-server

WORKDIR /repo/artifacts/api-server
RUN node ./build.mjs

FROM node:22-slim AS runtime
# esbuild-plugin-pino bakes the build-time output directory as an ABSOLUTE
# path string into the bundle (to resolve pino's worker-thread transport
# files: thread-stream-worker.mjs, pino-worker.mjs, pino-pretty.mjs). The
# runtime WORKDIR must match the build stage's dist path exactly, or pino
# crashes the process the first time it spins up a worker (e.g. under log
# volume) with "Cannot find module '.../dist/thread-stream-worker.mjs'".
WORKDIR /repo/artifacts/api-server
ENV NODE_ENV=production
COPY --from=base /repo/artifacts/api-server/dist ./dist
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
