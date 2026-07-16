# Building the Finance Mobile App

## EAS Build Setup

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) to produce preview and production binaries.

### Clerk Publishable Key

The `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is **not** hard-coded in `eas.json`. Instead, it must be stored as an EAS Secret so it is injected securely at build time without ever being committed to source control.

**One-time setup — run this once per environment:**

```bash
# From the artifacts/finance-mobile directory (or workspace root with -p flag)
eas secret:create --scope project \
  --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY \
  --value "<your Clerk publishable key>"
```

The value to use is the `CLERK_PUBLISHABLE_KEY` stored in Replit Secrets (Settings → Secrets). It starts with `pk_test_` (development) or `pk_live_` (production).

**When the Clerk key changes:**

1. Open your [EAS project secrets](https://expo.dev/accounts/_/projects/_/secrets) in the Expo dashboard.
2. Delete the existing `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` secret.
3. Re-run the `eas secret:create` command above with the new value.
4. Trigger a new EAS build — stale builds will not automatically pick up the updated secret.

### Why this approach?

The Metro dev server (local development) already reads `CLERK_PUBLISHABLE_KEY` from the Replit environment and maps it to `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` at startup (see `scripts/build.js` line 143). EAS Secrets mirror this pattern for cloud builds without hard-coding the value in `eas.json`, which would cause credentials to silently drift whenever the key rotates.
