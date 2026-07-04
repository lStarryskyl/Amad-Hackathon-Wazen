---
name: Guardia branding & reset
description: Logo asset paths, app.json identifiers, dev reset endpoint, APK build setup
---

## Logo assets
- `artifacts/finance-mobile/assets/images/logo.png` — full Guardia shield with circuit pattern (use in screens as `<Image source={require("../../assets/images/logo.png")} />`)
- `artifacts/finance-mobile/assets/images/icon.png` — app icon: dark navy shield with heartbeat pulse (used by app.json, splash)
- `artifacts/finance-mobile/assets/images/adaptive-icon.png` — Android adaptive icon (white bg variant)

## app.json identifiers
- name: "Guardia", slug: "guardia", scheme: "guardia"
- iOS bundleIdentifier: `com.guardia.app`
- Android package: `com.guardia.app`
- userInterfaceStyle: "dark", splash bg: "#0A0E1A"

## Dev reset endpoint
- `POST /api/dev/reset` — requireAuth, gated on `NODE_ENV !== "production"`
- Wipes all user data in FK-safe order; route is in `artifacts/api-server/src/routes/devReset.ts`
- Profile screen calls it; prompts user to sign out after reset
- Users table PK is `id` (= Clerk userId directly, NOT a separate clerkId column)
- Categories table has no userId column (system/shared table — don't try to delete by userId)
- Consent table is `consentRecordsTable` (not `consentTable`)

## Middleware path
- Correct import: `../middlewares/requireAuth` (note: "middlewares" plural)

## APK build
- `eas.json` at repo root of finance-mobile artifact
- preview profile builds `.apk` for internal distribution
- production profile builds `.aab` for Play Store

## API URL in mobile
- Base URL set from `process.env.EXPO_PUBLIC_DOMAIN` in `app/_layout.tsx` via `setBaseUrl`
- For direct fetch calls (not via api-client-react), construct: `const base = domain ? \`https://\${domain}\` : "http://localhost:8080"`

**Why:** Needed clean APK-ready config and a way to wipe user data for onboarding flow testing without recreating Clerk accounts.
