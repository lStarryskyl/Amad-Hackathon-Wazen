---
name: Clerk auth wiring for Expo Go
description: @clerk/expo version constraints, tokenCache removal, and auth token sync pattern for Expo Go compatibility
---

## Rule
Use `@clerk/expo@^2.x` — do NOT upgrade to v3+.

**Why:** `@clerk/expo` v3+ introduced a native `ClerkExpo` module that requires a custom dev build. It crashes with `Cannot find native module 'ClerkExpo'` in Expo Go (standard). v2 has no native dependency and works in Expo Go out of the box.

**How to apply:**
- Keep `@clerk/expo` pinned to `^2.x` in `artifacts/finance-mobile/package.json`.
- Do NOT import from `@clerk/expo/token-cache` — that subpath also triggers native module loading. Remove `tokenCache` prop from `<ClerkProvider>` entirely; Clerk will use in-memory storage (sessions don't persist across cold restarts in Expo Go, which is acceptable for dev).
- `useSSO` also crashes in Expo Go — use email/password auth only.
- `setAuthTokenGetter` must live inside `AuthTokenSync` component rendered under `<ClerkLoaded>` inside the root `_layout.tsx`, not just the `(home)` layout.
