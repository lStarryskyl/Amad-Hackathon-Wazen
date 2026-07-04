---
name: AI Finance App Architecture
description: Key wiring, routing, and auth decisions for the Guardia AI Finance app
---

# AI Finance App Architecture

## Stack
- Expo SDK 54 mobile app at `artifacts/finance-mobile/`
- Express API server at `artifacts/api-server/` (port 8080 in dev)
- PostgreSQL via Drizzle ORM at `lib/db/`
- Clerk auth (provisioned; keys in secrets)
- OpenAI (key not yet set — user must add OPENAI_API_KEY)
- Generated React Query hooks at `lib/api-client-react/src/generated/api.ts`

## Clerk Expo Wiring
- `ClerkProvider` + `ClerkLoaded` wraps the entire app in `app/_layout.tsx`
- `tokenCache` from `@clerk/expo/token-cache` (SecureStore)
- `proxyUrl` from `EXPO_PUBLIC_CLERK_PROXY_URL` (empty in dev, auto-set in prod)
- Auth token getter set in `app/(home)/_layout.tsx` via `setAuthTokenGetter(() => getToken())`
- DO NOT use `setAuthTokenGetter` in web apps — Expo/mobile only

## Route Structure
```
app/
  _layout.tsx       # ClerkProvider + font loading + all providers
  (auth)/           # sign-in, sign-up custom screens
  (home)/           # auth guard → setAuthTokenGetter → 5-tab layout
  onboarding/       # welcome → consent → complete
```

## JIT User Provisioning
- `getOrCreateUser(clerkUserId)` in `artifacts/api-server/src/lib/userProvisioning.ts`
- First hit of any authenticated endpoint creates user + seeds 6 months of demo data
- 3 accounts (Chase checking/savings, Visa credit), 10 categories, ~150 transactions, 4 goals, 6 recurring obligations
- Categories are system-wide (no userId) — seeded once globally

## API Routes
All under `/api/`: `profile`, `accounts`, `transactions`, `categories`, `goals`, `consent/accept`, `onboarding`, `summary`, `ai/test`

## Design Theme
- Background: `#0A0E1A`, Card: `#111827`, Primary: `#3B82F6`, Accent green: `#10B981`, Danger red: `#EF4444`
- Font: Inter (loaded via `@expo-google-fonts/inter`)
- App name: "Guardia"

**Why:** These decisions are non-obvious from the code alone; the Clerk proxy + mobile token bearer pattern is especially easy to get wrong in future tasks.

**How to apply:** When adding new screens or API routes, follow the existing pattern. Never add bearer token auth to web apps. Always call `getOrCreateUser` at the start of any authenticated API handler.
