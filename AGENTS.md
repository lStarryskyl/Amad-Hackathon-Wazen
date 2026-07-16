# AGENTS.md — Wazen (وازن) Hackathon Repo

## Quick Reference

**Project:** Wazen — AI personal finance app (4 pillars: Protect, Master Past, Master Present, Master Future)
**Stack:** pnpm workspace, Node 24, Express 5, Expo 54, React Native, PostgreSQL + Drizzle, Clerk v3, OpenAI-compatible AI
**Workspace packages:** `@workspace/api-server`, `@workspace/finance-mobile`, `@workspace/wazen-landing`, `@workspace/db`, `@workspace/api-zod`

---

## Essential Commands

```bash
# Install (run once)
pnpm install

# Build shared libs (required before first run)
pnpm run typecheck:libs

# Typecheck everything
pnpm run typecheck

# Build all packages
pnpm run build

# Database migrations
pnpm --filter @workspace/db run push

# Regenerate API client after schema changes
pnpm codegen

# Run dev servers (3 terminals)
pnpm --filter @workspace/api-server run dev      # API on :8080
pnpm --filter @workspace/wazen-landing run dev   # Landing on :3000
pnpm --filter @workspace/finance-mobile run dev  # Expo DevTools
```

---

## Package Boundaries

| Package | Purpose | Entry Point |
|---------|---------|-------------|
| `artifacts/api-server` | Express 5 REST API | `src/index.ts` → `build.mjs` (esbuild) |
| `artifacts/finance-mobile` | Expo Router app | `app/_layout.tsx` |
| `artifacts/wazen-landing` | Vite + React marketing site | `src/main.tsx` |
| `libs/db` | Drizzle schema + migrations | `src/index.ts`, `drizzle.config.ts` |
| `libs/api-zod` | Zod schemas for API | `src/index.ts` |
| `libs/api-client-react` | Auto-generated React Query hooks | generated via `pnpm codegen` |

---

## Environment Variables

**Required in `.env` (root):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/wazen
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
PORT=8080
EXPO_PUBLIC_DOMAIN=https://your-api-domain.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**AI Configuration (optional, with defaults):**
| Variable | Default | Description |
|----------|---------|-------------|
| `AI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base URL (e.g., `https://opencode.ai/zen/v1`, `https://api.groq.com/openai/v1`) |
| `AI_MODEL` | `gpt-4o-mini` | Model identifier to use |
| `AI_API_KEY` | (required for OpenAI) | API key — optional for some providers |

**EXPO_PUBLIC_* are baked at build time** — for local dev, point to ngrok/Cloudflare tunnel.

---

## Docker Deployment

```bash
cp .env.docker .env   # fill in real values
docker compose up --build -d
docker compose exec api pnpm --filter @workspace/db run push

# Services:
# - postgres:5432 (healthchecked)
# - api:8080
# - landing:3000 (nginx, proxies /api to api:8080)
# - mobile-web:8081 (profile: demo, expo web export)
```

---

## Testing

```bash
# API unit tests (run after build)
pnpm --filter @workspace/api-server run test:fallback    # Pure logic, no DB
pnpm --filter @workspace/api-server run test:engagement  # Requires DB + server
pnpm --filter @workspace/api-server run test:simulations # Requires DB + server

# Mobile tests
pnpm --filter @workspace/finance-mobile run test
```

**Integration tests require `DATABASE_URL` set** — they spin up a test server against real DB.

---

## Codegen Workflow

1. Modify Drizzle schema in `libs/db/src/schema/`
2. Run `pnpm --filter @workspace/db run push` to apply to DB
3. Run `pnpm codegen` to regenerate:
   - `lib/api-zod/src/generated/`
   - `lib/api-client-react/src/generated/`
4. Commit generated files — CI checks for drift (`.github/workflows/codegen-check.yml`)

---

## Key Quirks

- **API dev script builds first**: `dev` = `build && start` (not hot reload)
- **Expo Router file-based nav**: screens in `app/(home)/(tabs)/`
- **Clerk proxy middleware** must mount before `express.json()`
- **ESM only**: all packages `"type": "module"`, Node `--enable-source-maps`
- **Regret Score terminology**: use "Regret Score" everywhere (not "Regret Meter" or "Regret Score™")
- **Bundle IDs**: iOS `com.wazen.finance`, Android `com.wazen.finance`, scheme `wazen://`
- **pnpm catalog** versions in `pnpm-workspace.yaml` — update there, not per-package
- **AI model-agnostic**: uses `AI_BASE_URL` + `AI_MODEL` env vars; works with any OpenAI-compatible provider (OpenAI, Groq, Opencode, Together, etc.)

---

## CI Gates

- `pnpm run typecheck` (all packages)
- `pnpm codegen` drift check (fails if generated client stale)
- Supply-chain policy: `minimumReleaseAge: 1440` (1-day delay for new npm versions)

---

## File Locations for Common Changes

| Change | Where |
|--------|-------|
| DB schema | `libs/db/src/schema/*.ts` |
| API routes | `artifacts/api-server/src/routes/*.ts` |
| AI prompts | `artifacts/api-server/src/routes/intelligence.ts` |
| AI orchestration | `artifacts/api-server/src/lib/aiOrchestration.ts` |
| Mobile screens | `artifacts/finance-mobile/app/(home)/(tabs)/*.tsx` |
| Landing copy | `artifacts/wazen-landing/src/pages/Home.tsx` |
| Shared types | `lib/api-zod/src/generated/types/*.ts` (generated) |