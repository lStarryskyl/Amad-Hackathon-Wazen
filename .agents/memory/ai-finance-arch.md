---
name: AI Finance App Architecture
description: Durable decisions and constraints for the Guardia AI Finance app; things not derivable from reading the code
---

# AI Finance App Architecture

## Consent-First Data Access
Financial routes (accounts, transactions, summary, goals, categories) require BOTH `requireAuth` AND `requireConsent` middleware. Consent is checked by looking up the user row — `hasConsented` must be true. Public/utility routes (profile, consent, onboarding, health) skip `requireConsent`.

**Why:** Trust-first design principle. Users must explicitly opt in before any financial data is shown.

## JIT User Provisioning Invariant
Every authenticated API handler that mutates user-scoped data (including consent and onboarding) must call `getOrCreateUser(userId)` before any DB writes. Without this, updates no-op for brand-new users who haven't hit a data endpoint yet.

**Why:** Consent/onboarding can be the very first API call after sign-up — no user row exists yet at that point.

## Mobile Auth Token Transport
`setAuthTokenGetter` is called both synchronously in the component body AND in a useEffect of the authenticated home layout. Calling it synchronously ensures the token is available for React Query's first fetch (which can execute before the effect runs).

**Why:** React Query fires fetches asynchronously after mount, but the first render effect runs just before, so timing is tight. Belt-and-suspenders approach prevents a race condition where the first API call lands without a Bearer token.

## Onboarding Gate in Mobile Routing
The `(home)/_layout.tsx` checks `useGetOnboardingStatus()` after auth and redirects to the appropriate onboarding screen before showing tabs. Shows a loading screen while the API call is in flight to prevent tab flash.

**Why:** Without this gate, a brand-new user would briefly see the dashboard before being redirected — violating the consent-first requirement.

## Feather Icon Mapping
The API seeds category icons using non-Feather names ("utensils", "car"). The mobile app maps them via `utils/iconMapping.ts → toFeatherIcon()`. All Feather icon rendering should go through this helper.

**Why:** Feather icon set has gaps vs common icon vocabulary; the mapping is the single source of truth.

## App Identity
App name: "Guardia". Color theme: background #0A0E1A, card #111827, primary #3B82F6, accent #10B981.
