# Builds the Wazen PWA (Expo Router static web export) and serves it with nginx.
# Build context must be the REPO ROOT so pnpm workspace linking resolves.
#
# EXPO_PUBLIC_* vars are compile-time (baked into the JS bundle at export time),
# so they must be passed as Docker build args, not just runtime env vars.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY scripts scripts
COPY artifacts/finance-mobile/package.json artifacts/finance-mobile/package.json
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/wazen-landing/package.json artifacts/wazen-landing/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json

# See artifacts/api-server/Dockerfile for why this benign non-zero exit is ignored.
RUN pnpm install --frozen-lockfile --filter @workspace/finance-mobile... || true

COPY lib/db lib/db
COPY lib/api-zod lib/api-zod
COPY lib/api-client-react lib/api-client-react
COPY artifacts/finance-mobile artifacts/finance-mobile

ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV EXPO_PUBLIC_DEV_BYPASS_AUTH=false
ENV CI=1

WORKDIR /repo/artifacts/finance-mobile
RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine AS runtime
COPY artifacts/finance-mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=base /repo/artifacts/finance-mobile/dist /usr/share/nginx/html
EXPOSE 8080
