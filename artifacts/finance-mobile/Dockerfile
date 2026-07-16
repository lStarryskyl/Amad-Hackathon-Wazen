# Mobile Web Export Dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs ./libs
COPY artifacts/finance-mobile ./artifacts/finance-mobile

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build mobile web export
RUN pnpm --filter @workspace/finance-mobile exec expo export --platform web --output-dir dist

# Runner stage - nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/artifacts/finance-mobile/dist /usr/share/nginx/html
COPY artifacts/finance-mobile/nginx-web.conf /etc/nginx/conf.d/default.conf

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]