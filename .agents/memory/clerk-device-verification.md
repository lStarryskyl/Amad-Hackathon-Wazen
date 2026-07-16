---
name: Clerk device verification (client trust)
description: Sign-ins stall with needs_second_factor even when MFA is off — new-device email code; plus headless FAPI test flow
---
# Clerk device verification / client trust

**Rule:** Custom Clerk sign-in flows MUST handle `needs_second_factor` (and `needs_client_trust`). Clerk (API version 2026-05-12) demands an emailed code when a user signs in from an unrecognized device, even when instance MFA is disabled (`sign_in.second_factor.required = false`) and the user has zero enrolled factors. `supported_second_factors` lists `email_code`.

**Why:** The Wazen sign-in screen only handled `status === "complete"` → silent infinite spinner: no error box, no failed network request (the sign_ins call returns 200 with a non-complete status). Undebuggable from the UI; only a direct FAPI call exposed `needs_second_factor`.

**How to apply:** After `signIn.password(...)` branch on status: `complete` → finalize; `needs_second_factor`/`needs_client_trust` → `signIn.mfa.sendEmailCode()` then collect code and `signIn.mfa.verifyEmailCode({ code })` → finalize; any other status → show a visible error. Never leave a non-complete status silent. (SDK: @clerk/expo v3 "Future" API; types in @clerk/shared dist/types/signInFuture.d.ts.)

## Headless Clerk auth testing (Frontend API)
- `POST https://<instance>.clerk.accounts.dev/v1/dev_browser` → token; append `?__clerk_db_jwt=<token>` to every FAPI call (dev instances).
- Sign-up: `POST /v1/client/sign_ups` (email_address, password) → `.../prepare_verification` (strategy=email_code) → `.../attempt_verification`.
- Sign-in: `POST /v1/client/sign_ins` (identifier, password) → if needs_second_factor: `.../prepare_second_factor` (strategy=email_code) → `.../attempt_second_factor`.
- Emails like `foo+clerk_test@example.com` accept the fixed verification code **424242** — no real inbox needed.
- Per-call API tokens: `POST /v1/client/sessions/<sid>/tokens` returns a JWT that expires in ~60s — fetch a fresh one per request.
