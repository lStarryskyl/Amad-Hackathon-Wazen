# Wazen — AI Personal Finance

Wazen is a mobile-first personal finance app that uses AI to score spending decisions, generate rescue plans, narrate financial history, and simulate what-if scenarios.

## Architecture

| Package | Path | Description |
|---|---|---|
| `@workspace/api-server` | `artifacts/api-server/` | Express 5 REST API (TypeScript, port 8080) |
| `@workspace/wazen-landing` | `artifacts/wazen-landing/` | Marketing landing page (Vite + React + Tailwind) |
| `@workspace/finance-mobile` | `artifacts/finance-mobile/` | Expo / React Native mobile app |
| `@workspace/db` | `lib/db/` | PostgreSQL schema + Drizzle ORM |
| `@workspace/api-client-react` | `lib/api-client-react/` | React Query hooks (generated from OpenAPI spec) |

## Running on Replit

Two workflows are configured:

- **artifacts/wazen-landing: web** — Landing page (webview)
- **artifacts/api-server: API Server** — API server on port 8080 (console)

## Required Secrets

| Secret | Description |
|---|---|
| `CLERK_SECRET_KEY` | Clerk backend secret (`sk_test_...`) |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_...`) |
| `AI_API_KEY` | NVIDIA API key (`nvapi-...`) — app works without it via deterministic fallback |

## AI Provider (NVIDIA)

| Env var | Value |
|---|---|
| `AI_BASE_URL` | `https://integrate.api.nvidia.com/v1` |
| `AI_MODEL` | `meta/llama-3.1-70b-instruct` |

These are set as shared env vars. Change `AI_MODEL` to switch models without touching code.
(`z-ai/glm-5.2` was tried July 2026 but NVIDIA's endpoint for it hung indefinitely — zero bytes returned even for tiny prompts. llama-3.1-70b answers in ~5s. Avoid reasoning/"thinking" models: several AI calls use small `max_tokens` budgets that thinking tokens exhaust.)

## Database

Replit's built-in PostgreSQL is used. `DATABASE_URL` is injected automatically.  
To push schema changes: `pnpm --filter @workspace/db run push`

## Key Commands

```bash
# Install all dependencies
pnpm install

# Build shared libraries (required before first run)
pnpm run typecheck:libs

# Push DB schema
pnpm --filter @workspace/db run push

# Regenerate API client after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Typecheck everything
pnpm run typecheck
```

## Notes

- The app is self-hostable: all it needs is PostgreSQL + Clerk + (optionally) an OpenAI-compatible key.
- AI features (rescue plans, money stories, regret scores) fall back to deterministic rules-based output when `AI_API_KEY` is not set.
- The mobile app (Expo) runs separately via `pnpm --filter @workspace/finance-mobile run dev` and requires a tunnel (ngrok / Cloudflare) for the API URL.

## User Preferences

- App name: **Wazen** (was Pulse)
- Branding: polished UI/UX — more context to be provided by user
- Self-hostable architecture must be preserved
