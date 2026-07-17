---
name: Dev auth bypass
description: How to test the finance mobile app without Clerk sign-in
---
Client: `constants/devFlags.ts` DEV_BYPASS_AUTH=true → root layout keeps ClerkProvider (hooks need context) but skips ClerkLoaded (waiting on it blanks the app on device); react-query retry:0 so 401s fail fast.
Server: `requireAuth.ts` — when NODE_ENV!=production and no Clerk token, requests run as `dev-bypass-user`, auto-provisioned + demo-seeded + hasConsented=true. `requireConsent` must read `(req as any).userId`, not re-run getAuth.
**Why:** ClerkLoaded never resolves reliably in Expo Go; unauthenticated 401s made every screen spin forever.
**How to apply:** flip DEV_BYPASS_AUTH=false to restore real auth; server fallback is inert in production.
