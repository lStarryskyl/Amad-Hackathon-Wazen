/**
 * Dev-only feature flags.
 * DEV_BYPASS_AUTH skips Clerk entirely and jumps straight into the app —
 * useful when testing screens that have nothing to do with auth.
 *
 * Defaults to true; set EXPO_PUBLIC_DEV_BYPASS_AUTH=false at bundle time to
 * exercise the real sign-in / sign-up flow.
 */
export const DEV_BYPASS_AUTH = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH !== "false";
