# Landing Page Dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs ./libs
COPY artifacts/wazen-landing ./artifacts/wazen-landing

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build landing page
RUN pnpm --filter @workspace/wazen-landing run build

# Runner stage - nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/artifacts/wazen-landing/dist /usr/share/nginx/html
COPY artifacts/wazen-landing/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]